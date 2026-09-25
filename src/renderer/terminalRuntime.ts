// Each pane's terminal lives here, outside React: the xterm Terminal, its addons and its shell.
// Store actions create and dispose runtimes. TerminalPane only lends a host element with
// attach() and takes it back with detach(), which never stops anything. So React re-rendering,
// remounting, or running effects twice in StrictMode can never start or kill a shell.

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { TERMINAL_FONT, THEME } from './theme';
import type { PtyCreated } from '../shared/types';

export interface RuntimeEvents {
  onTitle: (paneId: string, title: string) => void;
  onPtyCreated: (paneId: string, created: PtyCreated) => void;
}

interface RuntimeOptions {
  paneId: string;
  command: string;
  cwd: string | undefined;
  fontSize: number;
  events: RuntimeEvents;
}

const runtimes = new Map<string, TerminalRuntime>(); // pane id -> runtime
const byPty = new Map<number, TerminalRuntime>(); // pty id -> runtime
const earlyData = new Map<number, string>(); // output that arrived before its runtime knew its pty

export class TerminalRuntime {
  readonly paneId: string;
  readonly term: Terminal;
  private readonly fitAddon = new FitAddon();
  private readonly command: string;
  private readonly cwd: string | undefined;
  private readonly events: RuntimeEvents;
  ptyId: number | null = null;
  private opened = false;
  private spawned = false;
  private disposed = false;

  constructor({ paneId, command, cwd, fontSize, events }: RuntimeOptions) {
    this.paneId = paneId;
    this.command = command;
    this.cwd = cwd;
    this.events = events;
    this.term = new Terminal({
      fontFamily: TERMINAL_FONT,
      fontSize,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      scrollback: 10000,
      allowProposedApi: true,
      macOptionClickForcesSelection: true,
      theme: THEME,
    });
    this.term.loadAddon(this.fitAddon);
    // Links open in the browser with Cmd+click (Ctrl+click on other systems).
    this.term.loadAddon(
      new WebLinksAddon((event, uri) => {
        if (event.metaKey || event.ctrlKey) window.open(uri);
      }),
    );
    this.term.onData((data) => {
      if (this.ptyId !== null) window.termi.pty.write(this.ptyId, data);
    });
    this.term.onResize(({ cols, rows }) => {
      if (this.ptyId !== null) window.termi.pty.resize(this.ptyId, cols, rows);
    });
    this.term.onTitleChange((title) => this.events.onTitle(this.paneId, title));
  }

  // Show the terminal in `host`. The first call opens xterm and starts the shell, once, at the
  // size the pane has. Later calls only fit, or move the terminal if the host changed.
  attach(host: HTMLElement): void {
    if (this.disposed) return;
    if (!this.opened) {
      this.term.open(host);
      try {
        const webgl = new WebglAddon();
        webgl.onContextLoss(() => webgl.dispose());
        this.term.loadAddon(webgl);
      } catch {
        // WebGL is not available: xterm keeps its DOM renderer.
      }
      this.opened = true;
    } else if (this.term.element && this.term.element.parentElement !== host) {
      host.appendChild(this.term.element);
    }
    this.measure(host);
    if (!this.spawned) {
      this.spawned = true;
      void this.spawn();
    }
  }

  // React lends the host element back when the pane unmounts. The terminal and its shell live on.
  detach(): void {}

  fit(): void {
    if (this.opened && !this.disposed) this.fitAddon.fit();
  }

  focus(): void {
    if (this.opened && !this.disposed) this.term.focus();
  }

  write(data: string): void {
    this.term.write(data);
  }

  // Stop the shell now, and free the terminal after `delay`, once a closing tab has faded out.
  dispose(delay = 0): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.ptyId !== null) {
      window.termi.pty.kill(this.ptyId);
      byPty.delete(this.ptyId);
      earlyData.delete(this.ptyId);
    }
    runtimes.delete(this.paneId);
    const free = () => this.term.dispose();
    if (delay > 0) setTimeout(free, delay);
    else free();
  }

  // A tab that is not showing has no size, and a shell has to start at the size it will have,
  // so show the tab for the moment it takes to measure.
  private measure(host: HTMLElement): void {
    const view = host.closest('.tab-view');
    const hidden =
      view && !view.classList.contains('active') && !view.classList.contains('leaving');
    if (hidden) view.classList.add('active');
    this.fitAddon.fit();
    if (hidden) view.classList.remove('active');
  }

  private async spawn(): Promise<void> {
    const created = await window.termi.pty.create({
      cols: this.term.cols,
      rows: this.term.rows,
      cwd: this.cwd,
      command: this.command,
    });
    if (this.disposed) {
      window.termi.pty.kill(created.id);
      return;
    }
    this.ptyId = created.id;
    byPty.set(created.id, this);
    const pending = earlyData.get(created.id);
    if (pending) {
      this.term.write(pending);
      earlyData.delete(created.id);
    }
    this.events.onPtyCreated(this.paneId, created);
  }
}

export function createRuntime(options: RuntimeOptions): TerminalRuntime {
  const runtime = new TerminalRuntime(options);
  runtimes.set(options.paneId, runtime);
  return runtime;
}

export function getRuntime(paneId: string): TerminalRuntime | undefined {
  return runtimes.get(paneId);
}

export function runtimeForPty(ptyId: number): TerminalRuntime | undefined {
  return byPty.get(ptyId);
}

export function allRuntimes(): IterableIterator<TerminalRuntime> {
  return runtimes.values();
}

// Output for a shell whose runtime does not know its pty id yet is kept until it does.
export function routePtyData(ptyId: number, data: string): TerminalRuntime | undefined {
  const runtime = byPty.get(ptyId);
  if (runtime) runtime.write(data);
  else earlyData.set(ptyId, (earlyData.get(ptyId) ?? '') + data);
  return runtime;
}

export function forgetPtyData(ptyId: number): void {
  earlyData.delete(ptyId);
}

// This module holds live terminals. Hot-swapping it would leave the page on a copy that has
// none, so an edit to it reloads the page instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
