const os = require('os');
const fs = require('fs');
const path = require('path');
const pty = require('node-pty');

const FLUSH_MS = 8; // group output into batches, so fast output does not flood IPC
const TITLE_POLL_MS = 1000;

function defaultShell() {
  if (process.platform === 'win32') return process.env.COMSPEC || 'powershell.exe';
  return process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
}

// Expand "~" and fall back to the home folder when the path does not exist.
function resolveCwd(cwd) {
  const home = os.homedir();
  if (!cwd || !cwd.trim()) return home;
  const expanded = cwd.trim().replace(/^~(?=$|[\\/])/, home);
  try {
    if (fs.statSync(expanded).isDirectory()) return expanded;
  } catch {
    // Missing folder: use home below.
  }
  return home;
}

function shellEnv() {
  const env = { ...process.env };
  // Apps opened from Finder have no locale, which breaks Unicode in the shell.
  if (!env.LANG) env.LANG = 'en_US.UTF-8';
  env.TERM = 'xterm-256color';
  env.COLORTERM = 'truecolor';
  env.TERM_PROGRAM = 'Termi';
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

class PtyManager {
  constructor(send) {
    this.send = send; // (channel, ...args) => void
    this.ptys = new Map(); // id -> { proc, buffer, timer, title, shellName }
    this.nextId = 1;
    this.poller = setInterval(() => this.pollTitles(), TITLE_POLL_MS);
  }

  // Start a shell. When `command` is set, type it into the shell after the
  // shell prints its first output, so the user keeps a shell when it ends.
  create({ cols = 80, rows = 24, cwd, command } = {}) {
    const id = this.nextId++;
    const shell = defaultShell();
    const args = process.platform === 'win32' ? [] : ['-l'];
    const proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: resolveCwd(cwd),
      env: shellEnv(),
    });

    const shellName = path.basename(shell).replace(/\.exe$/i, '');
    const entry = { proc, buffer: '', timer: null, title: shellName, shellName };
    this.ptys.set(id, entry);

    let pendingCommand = command && command.trim() ? command : null;
    const typeCommand = () => {
      if (!pendingCommand) return;
      const lines = pendingCommand.split(/\r?\n/).filter((line) => line.trim());
      pendingCommand = null;
      proc.write(lines.join('\r') + '\r');
    };
    // Fallback in case the shell prints nothing at start-up.
    if (pendingCommand) setTimeout(typeCommand, 1500);

    proc.onData((data) => {
      if (pendingCommand) setTimeout(typeCommand, 60);
      entry.buffer += data;
      if (!entry.timer) {
        entry.timer = setTimeout(() => this.flush(id), FLUSH_MS);
      }
    });

    proc.onExit(({ exitCode }) => {
      this.flush(id);
      this.ptys.delete(id);
      this.send('pty:exit', id, exitCode);
    });

    return { id, pid: proc.pid, title: shellName };
  }

  flush(id) {
    const entry = this.ptys.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.timer = null;
    if (entry.buffer) {
      this.send('pty:data', id, entry.buffer);
      entry.buffer = '';
    }
  }

  write(id, data) {
    this.ptys.get(id)?.proc.write(data);
  }

  resize(id, cols, rows) {
    const entry = this.ptys.get(id);
    if (!entry || cols < 1 || rows < 1) return;
    try {
      entry.proc.resize(cols, rows);
    } catch {
      // The process may have just exited.
    }
  }

  kill(id) {
    const entry = this.ptys.get(id);
    if (!entry) return;
    try {
      entry.proc.kill();
    } catch {
      // Already gone.
    }
  }

  // Report the name of the program running in the foreground of each terminal.
  pollTitles() {
    for (const [id, entry] of this.ptys) {
      let title;
      try {
        title = entry.proc.process;
      } catch {
        continue;
      }
      if (title && title !== entry.title) {
        entry.title = title;
        this.send('pty:title', id, title);
      }
    }
  }

  // Terminals where a program other than the shell is running.
  busyCount() {
    let count = 0;
    for (const entry of this.ptys.values()) {
      const name = (entry.title || '').replace(/^-/, '');
      if (name && name !== entry.shellName) count += 1;
    }
    return count;
  }

  killAll() {
    clearInterval(this.poller);
    for (const id of this.ptys.keys()) this.kill(id);
  }
}

module.exports = { PtyManager };
