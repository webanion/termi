import { Terminal } from '../../node_modules/@xterm/xterm/lib/xterm.mjs';
import { FitAddon } from '../../node_modules/@xterm/addon-fit/lib/addon-fit.mjs';
import { WebglAddon } from '../../node_modules/@xterm/addon-webgl/lib/addon-webgl.mjs';
import { WebLinksAddon } from '../../node_modules/@xterm/addon-web-links/lib/addon-web-links.mjs';

const api = window.termi;

const DEFAULT_FONT_SIZE = 13;
const DURATION = 220; // matches --dur in styles.css
const SIDEBAR_MIN = 170;
const SIDEBAR_MAX = 420;

const THEME = {
  background: '#262624',
  foreground: '#e8e6dc',
  cursor: '#d97757',
  cursorAccent: '#262624',
  selectionBackground: 'rgba(217, 119, 87, 0.32)',
  selectionInactiveBackground: 'rgba(217, 119, 87, 0.18)',
  scrollbarSliderBackground: 'rgba(245, 240, 230, 0.12)',
  scrollbarSliderHoverBackground: 'rgba(245, 240, 230, 0.2)',
  scrollbarSliderActiveBackground: 'rgba(217, 119, 87, 0.45)',
  black: '#3a3936',
  red: '#e5776b',
  green: '#9cc289',
  yellow: '#e6bd6f',
  blue: '#82a9d9',
  magenta: '#c89cd9',
  cyan: '#80c5bc',
  white: '#d6d3c9',
  brightBlack: '#6b6962',
  brightRed: '#f08d80',
  brightGreen: '#b3d6a1',
  brightYellow: '#f0cf8c',
  brightBlue: '#9fc0e8',
  brightMagenta: '#d9b4e6',
  brightCyan: '#9ad8d0',
  brightWhite: '#faf9f5',
};

const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13 -8l-13 -8" /></svg>',
  stop: '<svg viewBox="0 0 24 24"><path d="M5 7a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -10" /></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" /></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" /></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>',
};

const $ = (selector) => document.querySelector(selector);

const state = {
  info: { platform: 'darwin', version: '' },
  settings: null,
  terminals: [], // { id, term, fit, pane, name, customName, proc, shellName, commandId, activity }
  activeId: null,
};

const earlyData = new Map(); // output that arrived before the terminal was registered
let layoutAnimating = false; // true while the sidebar slides, so terminals refit once at the end

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const isMac = () => state.info.platform === 'darwin';
const modKey = () => (isMac() ? '⌘' : 'Ctrl+');

async function saveSettings(patch) {
  state.settings = await api.settings.update(patch);
}

function getTerminal(id) {
  return state.terminals.find((t) => t.id === id);
}

function activeTerminal() {
  return getTerminal(state.activeId);
}

function isBusy(t) {
  const proc = (t.proc || '').replace(/^-/, '');
  return Boolean(proc) && proc !== t.shellName;
}

// ---------- Terminals ----------

async function createTerminal({ name, command, cwd, commandId } = {}) {
  const pane = el('div', 'term-pane');
  $('#terminals').appendChild(pane);

  const term = new Terminal({
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Monaco, 'Cascadia Mono', Consolas, monospace",
    fontSize: state.settings.fontSize,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: 'bar',
    cursorWidth: 2,
    scrollback: 10000,
    allowProposedApi: true,
    macOptionClickForcesSelection: true,
    theme: THEME,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  // Links open in the browser with Cmd+click (Ctrl+click on other systems).
  term.loadAddon(
    new WebLinksAddon((event, uri) => {
      if (event.metaKey || event.ctrlKey) window.open(uri);
    })
  );

  term.open(pane);
  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    term.loadAddon(webgl);
  } catch {
    // WebGL is not available: xterm keeps its DOM renderer.
  }

  // Measure the pane while it is visible, so the shell starts at the right size.
  pane.classList.add('active');
  fit.fit();
  if (state.activeId !== null) pane.classList.remove('active');

  const created = await api.pty.create({ cols: term.cols, rows: term.rows, cwd, command });
  const t = {
    id: created.id,
    term,
    fit,
    pane,
    name: name || created.title,
    customName: Boolean(name),
    proc: created.title,
    shellName: created.title,
    commandId: commandId || null,
    activity: false,
  };
  state.terminals.push(t);

  // Select to copy: when a mouse selection ends, the text goes to the clipboard.
  pane.addEventListener('mousedown', () => (selectingIn = t));

  term.onData((data) => api.pty.write(t.id, data));
  term.onResize(({ cols, rows }) => api.pty.resize(t.id, cols, rows));
  term.onTitleChange((title) => {
    if (!t.customName && title) {
      t.name = title;
      render();
    }
  });

  const pending = earlyData.get(t.id);
  if (pending) {
    term.write(pending);
    earlyData.delete(t.id);
  }

  return t;
}

// The new pane fades in on top. The old one stays under it until the fade ends.
function showPane(t, visible) {
  clearTimeout(t.paneTimer);
  if (visible) {
    t.pane.classList.remove('leaving');
    t.pane.classList.add('active');
    return;
  }
  if (!t.pane.classList.contains('active')) return;
  t.pane.classList.replace('active', 'leaving');
  t.paneTimer = setTimeout(() => t.pane.classList.remove('leaving'), DURATION);
}

function activate(id) {
  const t = getTerminal(id);
  if (!t) return;
  state.activeId = id;
  t.activity = false;
  for (const other of state.terminals) showPane(other, other.id === id);
  requestAnimationFrame(() => {
    t.fit.fit();
    t.term.focus();
  });
  render();
}

function closeTerminal(id) {
  const index = state.terminals.findIndex((t) => t.id === id);
  if (index === -1) return;
  const [t] = state.terminals.splice(index, 1);
  api.pty.kill(t.id);
  if (selectingIn === t) selectingIn = null;
  clearTimeout(t.paneTimer);
  t.pane.classList.replace('active', 'leaving');
  setTimeout(() => {
    t.term.dispose();
    t.pane.remove();
  }, DURATION);

  if (state.activeId === id) {
    state.activeId = null;
    const next = state.terminals[index] || state.terminals[index - 1];
    if (next) {
      activate(next.id);
      return;
    }
  }
  render();
}

async function openTerminal(options) {
  const t = await createTerminal(options);
  activate(t.id);
  return t;
}

function cycle(step) {
  if (state.terminals.length < 2) return;
  const index = state.terminals.findIndex((t) => t.id === state.activeId);
  const next = (index + step + state.terminals.length) % state.terminals.length;
  activate(state.terminals[next].id);
}

function setFontSize(size) {
  const fontSize = Math.min(28, Math.max(9, size));
  for (const t of state.terminals) t.term.options.fontSize = fontSize;
  activeTerminal()?.fit.fit();
  saveSettings({ fontSize });
}

api.pty.onData((id, data) => {
  const t = getTerminal(id);
  if (!t) {
    earlyData.set(id, (earlyData.get(id) || '') + data);
    return;
  }
  t.term.write(data);
  if (id !== state.activeId && !t.activity) {
    t.activity = true;
    renderTerminals();
  }
});

api.pty.onTitle((id, title) => {
  const t = getTerminal(id);
  if (!t) return;
  t.proc = title;
  render();
});

api.pty.onExit((id) => {
  earlyData.delete(id);
  if (getTerminal(id)) closeTerminal(id);
});

// ---------- Saved commands ----------

function commandById(id) {
  return state.settings.commands.find((c) => c.id === id);
}

function runningFor(commandId) {
  return state.terminals.find((t) => t.commandId === commandId);
}

function runCommand(cmd) {
  return openTerminal({ name: cmd.name, command: cmd.command, cwd: cmd.cwd, commandId: cmd.id });
}

async function toggleAutoStart(cmd) {
  const commands = state.settings.commands.map((c) => (c.id === cmd.id ? { ...c, autoStart: !c.autoStart } : c));
  await saveSettings({ commands });
  render();
}

// ---------- Rendering ----------

function render() {
  renderTerminals();
  renderCommands();
  renderTitle();
}

function renderTitle() {
  const t = activeTerminal();
  $('#title-text').textContent = t ? t.name : 'Termi';
  $('#title-sub').textContent = t && isBusy(t) && t.proc !== t.name ? t.proc : '';
  document.title = t ? `${t.name} | Termi` : 'Termi';
  $('#empty-state').hidden = state.terminals.length > 0;
}

const rows = {
  terminals: new Map(), // terminal id -> row
  commands: new Map(), // command id -> row
};

// Keep list rows in step with the data. Rows are updated in place, so hover and
// active styles can animate, and new or removed rows slide in and out.
function syncList(list, rowMap, entries, build, update) {
  const keep = new Set();
  let prev = null;
  entries.forEach((data, index) => {
    const key = data.id;
    let row = rowMap.get(key);
    if (!row) {
      row = build(key);
      rowMap.set(key, row);
      if (!document.body.classList.contains('preload')) {
        row.item.classList.add('entering');
        setTimeout(() => row.item.classList.remove('entering'), DURATION);
      }
    }
    keep.add(key);
    update(row, data, index);

    let next = prev ? prev.nextElementSibling : list.firstElementChild;
    while (next && next.classList.contains('leaving')) next = next.nextElementSibling;
    if (next !== row.item) list.insertBefore(row.item, next);
    prev = row.item;
  });

  for (const [key, row] of rowMap) {
    if (keep.has(key)) continue;
    rowMap.delete(key);
    row.item.classList.add('leaving');
    setTimeout(() => row.item.remove(), DURATION);
  }
}

function buildTerminalRow(id) {
  const item = el('li', 'item');
  const dot = el('span', 'dot');
  const name = el('span', 'item-name');
  const meta = el('span', 'item-meta');
  const kbd = el('span', 'item-kbd');
  const actions = el('span', 'item-actions');
  const close = el('button', 'icon-btn', ICONS.close);
  close.title = 'Close terminal';
  close.addEventListener('click', (event) => {
    event.stopPropagation();
    closeTerminal(id);
  });
  actions.append(close);
  item.append(dot, name, meta, kbd, actions);

  item.addEventListener('click', () => activate(id));
  item.addEventListener('dblclick', () => {
    const t = getTerminal(id);
    if (t) startRename(t, name);
  });
  return { item, dot, name, meta, kbd };
}

function updateTerminalRow(row, t, index) {
  row.item.classList.toggle('active', t.id === state.activeId);
  row.item.title = t.commandId ? commandById(t.commandId)?.command || t.name : t.name;
  row.dot.className = `dot ${t.activity ? 'activity' : isBusy(t) ? 'busy' : ''}`;
  if (row.name.contentEditable !== 'true') row.name.textContent = t.name;
  const meta = isBusy(t) && t.proc !== t.name ? t.proc : '';
  row.meta.textContent = meta;
  row.meta.hidden = !meta;
  row.kbd.textContent = index < 9 ? `${modKey()}${index + 1}` : '';
  row.kbd.hidden = index >= 9;
}

function renderTerminals() {
  $('#running-count').textContent = state.terminals.length;
  syncList($('#terminal-list'), rows.terminals, state.terminals, buildTerminalRow, updateTerminalRow);
}

function startRename(t, nameEl) {
  nameEl.contentEditable = 'true';
  nameEl.focus();
  document.getSelection().selectAllChildren(nameEl);

  const finish = (commit) => {
    nameEl.removeEventListener('keydown', onKey);
    nameEl.removeEventListener('blur', onBlur);
    nameEl.removeAttribute('contenteditable');
    const value = nameEl.textContent.trim();
    if (commit && value) {
      t.name = value;
      t.customName = true;
    }
    render();
    if (t.id === state.activeId) t.term.focus();
  };
  const onKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      finish(false);
    }
  };
  const onBlur = () => finish(true);
  nameEl.addEventListener('keydown', onKey);
  nameEl.addEventListener('blur', onBlur);
}

function buildCommandRow(id) {
  const item = el('li', 'item');
  const stateIcon = el('span', 'cmd-state');
  const name = el('span', 'item-name');

  const actions = el('span', 'item-actions');
  const stop = el('button', 'icon-btn', ICONS.stop);
  stop.title = 'Stop and close';
  stop.addEventListener('click', (event) => {
    event.stopPropagation();
    const running = runningFor(id);
    if (running) closeTerminal(running.id);
  });
  const edit = el('button', 'icon-btn', ICONS.edit);
  edit.title = 'Edit';
  edit.addEventListener('click', (event) => {
    event.stopPropagation();
    openCommandDialog(commandById(id));
  });

  const auto = el('button', 'icon-btn auto-btn', ICONS.bolt);
  auto.addEventListener('click', (event) => {
    event.stopPropagation();
    const cmd = commandById(id);
    if (cmd) toggleAutoStart(cmd);
  });

  // One group, so every button has the same gap.
  actions.append(stop, edit, auto);
  item.append(stateIcon, name, actions);

  // A running command gets focus. A stopped one starts.
  item.addEventListener('click', () => {
    const current = runningFor(id);
    const cmd = commandById(id);
    if (current) activate(current.id);
    else if (cmd) runCommand(cmd);
  });
  return { item, stateIcon, name, stop, auto, running: null };
}

function updateCommandRow(row, cmd) {
  const running = runningFor(cmd.id);
  row.item.classList.toggle('active', Boolean(running && running.id === state.activeId));
  row.item.title = `${cmd.command}${cmd.cwd ? `\nin ${cmd.cwd}` : ''}`;
  if (row.running !== Boolean(running)) {
    row.running = Boolean(running);
    row.stateIcon.innerHTML = running ? '<span class="dot"></span>' : ICONS.play;
  }
  row.name.textContent = cmd.name;
  row.stop.hidden = !running;
  row.auto.classList.toggle('on', cmd.autoStart);
  row.auto.title = cmd.autoStart ? 'Starts when Termi opens. Click to turn off.' : 'Start when Termi opens';
}

function renderCommands() {
  const { commands } = state.settings;
  $('#commands-empty').hidden = commands.length > 0;
  syncList($('#command-list'), rows.commands, commands, buildCommandRow, updateCommandRow);
}

// ---------- Select to copy ----------

let selectingIn = null; // the terminal where the last mouse press started
let toastTimer = 0;

function showToast(text) {
  const toast = $('#toast');
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1400);
}

// Listen on the document, because a drag can end outside the terminal.
document.addEventListener('mouseup', () => {
  const t = selectingIn;
  selectingIn = null;
  if (!t) return;
  // Wait a moment, so xterm has finished word and line selection on double and triple click.
  setTimeout(() => {
    if (!t.term.hasSelection()) return;
    const text = t.term.getSelection();
    if (!text.trim()) return;
    api.copyText(text);
    showToast('Copied to clipboard');
  });
});

// ---------- System stats ----------

function formatBytes(bytes, suffix = '', short = false) {
  const units = short ? ['B', 'K', 'M', 'G', 'T'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  // Switch unit at 1000, so the number never needs more than 3 digits.
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)}${short ? '' : ' '}${units[unit]}${suffix}`;
}

function setStat(id, value, title, percent) {
  const stat = $(id);
  stat.querySelector('.stat-value').textContent = value;
  stat.title = title;
  const bar = stat.querySelector('.stat-bar > span');
  if (bar && percent !== undefined) {
    bar.style.width = `${percent.toFixed(1)}%`;
    stat.classList.toggle('high', percent >= 85);
  }
}

function renderStats({ cpu, memUsed, memTotal, down, up }) {
  setStat('#stat-cpu', `${Math.round(cpu)}%`, `CPU use: ${cpu.toFixed(1)}%`, cpu);

  if (memUsed !== null && memTotal) {
    const percent = (memUsed / memTotal) * 100;
    setStat(
      '#stat-mem',
      formatBytes(memUsed, '', true),
      `Memory use: ${formatBytes(memUsed)} of ${formatBytes(memTotal)} (${Math.round(percent)}%)`,
      percent
    );
  }

  const unknown = 'Not available on this system';
  setStat('#stat-down', down === null ? '-' : formatBytes(down, '/s'), down === null ? unknown : 'Download speed');
  setStat('#stat-up', up === null ? '-' : formatBytes(up, '/s'), up === null ? unknown : 'Upload speed');
}

api.onStats(renderStats);

// ---------- Command dialog ----------

const dialog = $('#command-dialog');
const form = $('#command-form');
let editingId = null;

let dialogTimer = 0;

function openCommandDialog(cmd = null) {
  clearTimeout(dialogTimer);
  dialog.classList.remove('closing');
  editingId = cmd?.id ?? null;
  $('#command-dialog-title').textContent = cmd ? 'Edit saved command' : 'New saved command';
  form.elements.name.value = cmd?.name ?? '';
  form.elements.command.value = cmd?.command ?? '';
  form.elements.cwd.value = cmd?.cwd ?? '';
  form.elements.autoStart.checked = cmd?.autoStart ?? false;
  const del = $('#delete-command');
  del.hidden = !cmd;
  del.classList.remove('confirm');
  del.textContent = 'Delete';
  if (!dialog.open) dialog.showModal();
  form.elements.name.focus();
}

// Play the closing animation, then close.
function closeCommandDialog() {
  if (!dialog.open || dialog.classList.contains('closing')) return;
  dialog.classList.add('closing');
  dialogTimer = setTimeout(() => dialog.close(), DURATION);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = {
    name: form.elements.name.value.trim(),
    command: form.elements.command.value.trim(),
    cwd: form.elements.cwd.value.trim(),
    autoStart: form.elements.autoStart.checked,
  };
  if (!data.name || !data.command) return;

  const commands = editingId
    ? state.settings.commands.map((c) => (c.id === editingId ? { ...c, ...data } : c))
    : [...state.settings.commands, { id: uid(), ...data }];
  await saveSettings({ commands });

  // Keep the name of a running terminal in step with its command.
  if (editingId) {
    for (const t of state.terminals) if (t.commandId === editingId) t.name = data.name;
  }
  closeCommandDialog();
  render();
});

// Cmd+Enter saves from inside the command box.
form.elements.command.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    form.requestSubmit();
  }
});

$('#cancel-command').addEventListener('click', closeCommandDialog);
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeCommandDialog();
});
dialog.addEventListener('close', () => {
  dialog.classList.remove('closing');
  activeTerminal()?.term.focus();
});

$('#delete-command').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  if (!button.classList.contains('confirm')) {
    button.classList.add('confirm');
    button.textContent = 'Click again to delete';
    return;
  }
  await saveSettings({ commands: state.settings.commands.filter((c) => c.id !== editingId) });
  for (const t of state.terminals) if (t.commandId === editingId) t.commandId = null;
  closeCommandDialog();
  render();
});

$('#pick-folder').addEventListener('click', async () => {
  const current = form.elements.cwd.value.trim().replace(/^~(?=$|\/)/, state.info.home);
  const folder = await api.pickFolder(current || undefined);
  if (folder) {
    const home = state.info.home;
    form.elements.cwd.value = folder === home || folder.startsWith(`${home}/`) ? `~${folder.slice(home.length)}` : folder;
  }
});

// ---------- Sidebar ----------

let layoutTimer = 0;

// Refitting on every frame of a slide would resize the shell many times. Fit once at the end.
function animateLayout() {
  layoutAnimating = true;
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(() => {
    layoutAnimating = false;
    activeTerminal()?.fit.fit();
  }, DURATION + 20);
}

function applySidebar() {
  animateLayout();
  document.body.classList.toggle('sidebar-hidden', state.settings.sidebarHidden);
  document.documentElement.style.setProperty('--sidebar-w', `${state.settings.sidebarWidth}px`);
}

function toggleSidebar() {
  saveSettings({ sidebarHidden: !state.settings.sidebarHidden }).then(applySidebar);
}

function setupResizer() {
  const resizer = $('#resizer');
  resizer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    resizer.setPointerCapture(event.pointerId);
    resizer.classList.add('dragging');
    document.body.classList.add('resizing');
    let width = state.settings.sidebarWidth;

    const onMove = (move) => {
      width = Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, move.clientX)));
      document.documentElement.style.setProperty('--sidebar-w', `${width}px`);
    };
    const onUp = () => {
      resizer.classList.remove('dragging');
      document.body.classList.remove('resizing');
      resizer.removeEventListener('pointermove', onMove);
      resizer.removeEventListener('pointerup', onUp);
      saveSettings({ sidebarWidth: width });
      activeTerminal()?.fit.fit();
    };
    resizer.addEventListener('pointermove', onMove);
    resizer.addEventListener('pointerup', onUp);
  });
  resizer.addEventListener('dblclick', () => {
    saveSettings({ sidebarWidth: 232 }).then(applySidebar);
  });
}

// ---------- Window ----------

function applyWindowState({ isFullScreen, isFocused }) {
  document.body.classList.toggle('fullscreen', Boolean(isFullScreen) && isMac());
  document.body.classList.toggle('blurred', !isFocused);
}

function setupTrafficLights() {
  if (isMac()) return;
  const lights = $('#traffic-lights');
  lights.hidden = false;
  lights.addEventListener('click', (event) => {
    const action = event.target.closest('.light')?.dataset.action;
    if (action === 'close') api.window.close();
    if (action === 'minimize') api.window.minimize();
    if (action === 'maximize') api.window.toggleMaximize();
  });
}

// Double-click on an empty part of the header zooms the window, like a native title bar.
function setupHeaderDoubleClick() {
  for (const head of document.querySelectorAll('.main-head, .sidebar-head')) {
    head.addEventListener('dblclick', (event) => {
      if (event.target.closest('button')) return;
      api.window.toggleMaximize();
    });
  }
}

// ---------- Menu actions ----------

const menuActions = {
  'new-terminal': () => openTerminal(),
  'new-command': () => openCommandDialog(),
  'close-terminal': () => {
    if (dialog.open) closeCommandDialog();
    else if (state.activeId !== null) closeTerminal(state.activeId);
  },
  clear: () => activeTerminal()?.term.clear(),
  'toggle-sidebar': toggleSidebar,
  'font-bigger': () => setFontSize(state.settings.fontSize + 1),
  'font-smaller': () => setFontSize(state.settings.fontSize - 1),
  'font-reset': () => setFontSize(DEFAULT_FONT_SIZE),
  'next-terminal': () => cycle(1),
  'prev-terminal': () => cycle(-1),
};

api.onMenuAction((action) => {
  const select = /^select-terminal-(\d)$/.exec(action);
  if (select) {
    const t = state.terminals[Number(select[1])];
    if (t) activate(t.id);
    return;
  }
  menuActions[action]?.();
});

// ---------- Start-up ----------

async function init() {
  const [info, settings, windowState] = await Promise.all([api.info(), api.settings.get(), api.window.getState()]);
  state.info = info;
  state.settings = settings;
  document.body.classList.add(`platform-${info.platform}`);
  $('.btn.primary kbd').textContent = `${modKey()}T`;

  applySidebar();
  applyWindowState(windowState);
  api.window.onState(applyWindowState);
  setupTrafficLights();
  setupHeaderDoubleClick();
  setupResizer();

  $('#hide-sidebar').addEventListener('click', toggleSidebar);
  $('#show-sidebar').addEventListener('click', toggleSidebar);
  $('#add-terminal').addEventListener('click', () => openTerminal());
  $('#empty-new-terminal').addEventListener('click', () => openTerminal());
  $('#add-command').addEventListener('click', () => openCommandDialog());
  $('#empty-new-command').addEventListener('click', () => openCommandDialog());
  $('#commands-empty').addEventListener('click', () => openCommandDialog());

  let fitFrame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(fitFrame);
    if (layoutAnimating) return;
    fitFrame = requestAnimationFrame(() => activeTerminal()?.fit.fit());
  }).observe($('#terminals'));

  // Start saved commands marked auto-start. With none, open a plain shell.
  const autoStart = settings.commands.filter((c) => c.autoStart);
  if (autoStart.length) {
    for (const cmd of autoStart) await createTerminal({ name: cmd.name, command: cmd.command, cwd: cmd.cwd, commandId: cmd.id });
    activate(state.terminals[0].id);
  } else {
    await openTerminal();
  }

  // Turn animations on only after the first layout, so the app does not animate into place.
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('preload')));
}

init();
