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

const MAX_PANES = 4;
const PANE_AREAS = ['a', 'b', 'c', 'd'];

// Layouts for a tab with more than one terminal. Each string is one grid row, and each
// letter is one terminal, in order. The first layout in each list is the default.
const LAYOUTS = {
  2: [
    { id: 'columns', label: 'Side by side', areas: ['a b'] },
    { id: 'rows', label: 'Stacked', areas: ['a', 'b'] },
  ],
  3: [
    { id: 'main-left', label: 'Large on the left', areas: ['a b', 'a c'] },
    { id: 'main-top', label: 'Large on top', areas: ['a a', 'b c'] },
    { id: 'columns', label: 'Side by side', areas: ['a b c'] },
    { id: 'rows', label: 'Stacked', areas: ['a', 'b', 'c'] },
  ],
  4: [
    { id: 'grid', label: 'Grid', areas: ['a b', 'c d'] },
    { id: 'main-left', label: 'Large on the left', areas: ['a b', 'a c', 'a d'] },
    { id: 'columns', label: 'Side by side', areas: ['a b c d'] },
    { id: 'rows', label: 'Stacked', areas: ['a', 'b', 'c', 'd'] },
  ],
};

const $ = (selector) => document.querySelector(selector);

const state = {
  info: { platform: 'darwin', version: '' },
  settings: null,
  // A tab holds 1 to 4 panes. Only a saved command opens more than one.
  // { id, view, name, customName, commandId, activity, layout, panes, focused }
  tabs: [],
  activeId: null,
};

const panes = new Map(); // pty id -> { id, tab, box, term, fit, command, proc, shellName, ui }
const earlyData = new Map(); // output that arrived before the terminal was registered
let nextTabId = 1;
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

function getTab(id) {
  return state.tabs.find((t) => t.id === id);
}

function activeTab() {
  return getTab(state.activeId);
}

function isBusy(pane) {
  const proc = (pane.proc || '').replace(/^-/, '');
  return Boolean(proc) && proc !== pane.shellName;
}

function fitTab(tab) {
  for (const pane of tab?.panes ?? []) pane.fit.fit();
}

// ---------- Terminals ----------

function buildPane(tab, command) {
  const box = el('div', 'term-pane');
  // The head only shows when the tab has more than one pane.
  const head = el('div', 'pane-head');
  const dot = el('span', 'dot');
  const name = el('span', 'pane-name');
  const proc = el('span', 'pane-proc');
  const close = el('button', 'icon-btn', ICONS.close);
  close.title = 'Close this terminal';
  head.append(dot, name, proc, close);
  const body = el('div', 'pane-body');
  box.append(head, body);
  tab.view.appendChild(box);

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

  term.open(body);
  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    term.loadAddon(webgl);
  } catch {
    // WebGL is not available: xterm keeps its DOM renderer.
  }

  const pane = { id: null, tab, box, term, fit, command, proc: '', shellName: '', ui: { dot, name, proc } };

  // Select to copy: when a mouse selection ends, the text goes to the clipboard.
  box.addEventListener('mousedown', () => (selectingIn = pane));
  box.addEventListener('focusin', () => focusPane(pane));
  head.addEventListener('click', () => term.focus());
  close.addEventListener('click', (event) => {
    event.stopPropagation();
    removePane(pane);
  });
  return pane;
}

function attachPty(pane, created) {
  pane.id = created.id;
  pane.proc = created.title;
  pane.shellName = created.title;
  panes.set(pane.id, pane);

  const { term, tab } = pane;
  term.onData((data) => api.pty.write(pane.id, data));
  term.onResize(({ cols, rows }) => api.pty.resize(pane.id, cols, rows));
  term.onTitleChange((title) => {
    if (!tab.customName && title) {
      tab.name = title;
      render();
    }
  });

  const pending = earlyData.get(pane.id);
  if (pending) {
    term.write(pending);
    earlyData.delete(pane.id);
  }
}

// `commands` has one entry per pane. An empty command opens a plain shell.
async function createTab({ name, commands = [''], cwd, commandId, layout } = {}) {
  const view = el('div', 'tab-view');
  $('#terminals').appendChild(view);
  const tab = {
    id: nextTabId++,
    view,
    name: name || '',
    customName: Boolean(name),
    commandId: commandId || null,
    activity: false,
    layout: layout || null,
    panes: [],
    focused: null,
  };
  tab.panes = commands.slice(0, MAX_PANES).map((command) => buildPane(tab, command));
  tab.focused = tab.panes[0];
  applyLayout(tab);

  // Measure the panes while they are visible, so each shell starts at the right size.
  view.classList.add('active');
  fitTab(tab);
  if (state.activeId !== null) view.classList.remove('active');

  const created = await Promise.all(
    tab.panes.map((pane) => api.pty.create({ cols: pane.term.cols, rows: pane.term.rows, cwd, command: pane.command }))
  );
  created.forEach((info, index) => attachPty(tab.panes[index], info));
  if (!tab.name) tab.name = created[0].title;
  state.tabs.push(tab);
  return tab;
}

// The new tab fades in on top. The old one stays under it until the fade ends.
function showView(tab, visible) {
  clearTimeout(tab.viewTimer);
  if (visible) {
    tab.view.classList.remove('leaving');
    tab.view.classList.add('active');
    return;
  }
  if (!tab.view.classList.contains('active')) return;
  tab.view.classList.replace('active', 'leaving');
  tab.viewTimer = setTimeout(() => tab.view.classList.remove('leaving'), DURATION);
}

function activate(id) {
  const tab = getTab(id);
  if (!tab) return;
  state.activeId = id;
  tab.activity = false;
  for (const other of state.tabs) showView(other, other.id === id);
  requestAnimationFrame(() => {
    fitTab(tab);
    tab.focused.term.focus();
  });
  render();
}

function focusPane(pane) {
  if (pane.tab.focused === pane) return;
  pane.tab.focused = pane;
  render();
}

function forgetPane(pane) {
  api.pty.kill(pane.id);
  panes.delete(pane.id);
  if (selectingIn === pane) selectingIn = null;
}

function closeTab(id) {
  const index = state.tabs.findIndex((t) => t.id === id);
  if (index === -1) return;
  const [tab] = state.tabs.splice(index, 1);
  for (const pane of tab.panes) forgetPane(pane);
  clearTimeout(tab.viewTimer);
  tab.view.classList.replace('active', 'leaving');
  setTimeout(() => {
    for (const pane of tab.panes) pane.term.dispose();
    tab.view.remove();
  }, DURATION);

  if (state.activeId === id) {
    state.activeId = null;
    const next = state.tabs[index] || state.tabs[index - 1];
    if (next) {
      activate(next.id);
      return;
    }
  }
  render();
}

// Close one pane. The other panes of the tab take its space. The last pane closes the tab.
function removePane(pane) {
  const { tab } = pane;
  const index = tab.panes.indexOf(pane);
  if (index === -1) return;
  if (tab.panes.length === 1) {
    closeTab(tab.id);
    return;
  }
  forgetPane(pane);
  tab.panes.splice(index, 1);
  pane.term.dispose();
  pane.box.remove();
  if (tab.focused === pane) tab.focused = tab.panes[index] || tab.panes[index - 1];
  applyLayout(tab);
  if (tab.id === state.activeId) {
    requestAnimationFrame(() => {
      fitTab(tab);
      tab.focused.term.focus();
    });
  }
  render();
}

async function openTab(options) {
  const tab = await createTab(options);
  activate(tab.id);
  return tab;
}

function cycle(step) {
  if (state.tabs.length < 2) return;
  const index = state.tabs.findIndex((t) => t.id === state.activeId);
  const next = (index + step + state.tabs.length) % state.tabs.length;
  activate(state.tabs[next].id);
}

function cyclePane(step) {
  const tab = activeTab();
  if (!tab || tab.panes.length < 2) return;
  const index = tab.panes.indexOf(tab.focused);
  tab.panes[(index + step + tab.panes.length) % tab.panes.length].term.focus();
}

function setFontSize(size) {
  const fontSize = Math.min(28, Math.max(9, size));
  for (const tab of state.tabs) for (const pane of tab.panes) pane.term.options.fontSize = fontSize;
  fitTab(activeTab());
  saveSettings({ fontSize });
}

api.pty.onData((id, data) => {
  const pane = panes.get(id);
  if (!pane) {
    earlyData.set(id, (earlyData.get(id) || '') + data);
    return;
  }
  pane.term.write(data);
  const { tab } = pane;
  if (tab.id !== state.activeId && !tab.activity) {
    tab.activity = true;
    renderTerminals();
  }
});

api.pty.onTitle((id, title) => {
  const pane = panes.get(id);
  if (!pane) return;
  pane.proc = title;
  render();
});

api.pty.onExit((id) => {
  earlyData.delete(id);
  const pane = panes.get(id);
  if (pane) removePane(pane);
});

// ---------- Layouts ----------

function layoutFor(tab) {
  const options = LAYOUTS[tab.panes.length];
  if (!options) return null;
  return options.find((l) => l.id === tab.layout) || options[0];
}

function applyLayout(tab) {
  const layout = layoutFor(tab);
  const { style } = tab.view;
  tab.view.classList.toggle('split', Boolean(layout));
  const grid = layout ? layout.areas.map((row) => row.split(' ')) : null;
  style.gridTemplateAreas = layout ? layout.areas.map((row) => `"${row}"`).join(' ') : '';
  style.gridTemplateColumns = grid ? `repeat(${grid[0].length}, minmax(0, 1fr))` : '';
  style.gridTemplateRows = grid ? `repeat(${grid.length}, minmax(0, 1fr))` : '';
  tab.panes.forEach((pane, index) => (pane.box.style.gridArea = layout ? PANE_AREAS[index] : ''));
}

function setLayout(tab, id) {
  tab.layout = id;
  applyLayout(tab);
  renderLayoutControl();
  requestAnimationFrame(() => fitTab(tab));
  // Remember the layout for the next time the saved command runs.
  if (tab.commandId && commandById(tab.commandId)) {
    saveSettings({ commands: state.settings.commands.map((c) => (c.id === tab.commandId ? { ...c, layout: id } : c)) });
  }
}

// Draw the layout as an icon: a frame, and a line wherever two panes meet.
function layoutIcon(layout) {
  const grid = layout.areas.map((row) => row.split(' '));
  const rowCount = grid.length;
  const colCount = grid[0].length;
  const x = (col) => +(4 + (16 * col) / colCount).toFixed(2);
  const y = (row) => +(5 + (14 * row) / rowCount).toFixed(2);
  const parts = ['<rect x="4" y="5" width="16" height="14" rx="2" />'];
  for (const area of new Set(grid.flat())) {
    let top = rowCount;
    let bottom = 0;
    let left = colCount;
    let right = 0;
    grid.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell !== area) return;
        top = Math.min(top, r);
        bottom = Math.max(bottom, r + 1);
        left = Math.min(left, c);
        right = Math.max(right, c + 1);
      })
    );
    if (right < colCount) parts.push(`<path d="M${x(right)} ${y(top)}V${y(bottom)}" />`);
    if (bottom < rowCount) parts.push(`<path d="M${x(left)} ${y(bottom)}H${x(right)}" />`);
  }
  return `<svg viewBox="0 0 24 24">${parts.join('')}</svg>`;
}

function renderLayoutControl() {
  const control = $('#layout-control');
  const tab = activeTab();
  const options = tab ? LAYOUTS[tab.panes.length] : null;
  control.classList.toggle('show', Boolean(options));
  $('#main-head').classList.toggle('has-layout', Boolean(options));
  if (!options) return;

  // Build the buttons only when the set of layouts changes, so the hover state can animate.
  const key = options.map((l) => l.id).join();
  if (control.dataset.key !== key) {
    control.dataset.key = key;
    control.replaceChildren(
      ...options.map((layout) => {
        const button = el('button', 'icon-btn', layoutIcon(layout));
        button.dataset.layout = layout.id;
        button.title = layout.label;
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-label', layout.label);
        button.addEventListener('click', () => {
          const current = activeTab();
          if (current) setLayout(current, layout.id);
        });
        return button;
      })
    );
    $('#main-head').style.setProperty('--layout-w', `${control.offsetWidth + 8}px`);
  }
  const current = layoutFor(tab).id;
  for (const button of control.children) {
    const on = button.dataset.layout === current;
    button.classList.toggle('on', on);
    button.setAttribute('aria-checked', String(on));
  }
}

// ---------- Saved commands ----------

function commandById(id) {
  return state.settings.commands.find((c) => c.id === id);
}

function runningFor(commandId) {
  return state.tabs.find((t) => t.commandId === commandId);
}

function commandTabOptions(cmd) {
  return {
    name: cmd.name,
    commands: cmd.terminals.map((t) => t.command),
    cwd: cmd.cwd,
    commandId: cmd.id,
    layout: cmd.layout,
  };
}

function runCommand(cmd) {
  return openTab(commandTabOptions(cmd));
}

// One line for a command that may have many lines.
function commandLabel(command) {
  return command
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('; ');
}

function commandSummary(cmd) {
  return cmd.terminals.map((t) => commandLabel(t.command) || 'Plain shell').join('\n');
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
  renderPanes();
}

// The program running in the pane that has focus, when it is not the shell.
function focusedProc(tab) {
  const pane = tab.focused;
  return pane && isBusy(pane) && pane.proc !== tab.name ? pane.proc : '';
}

function renderTitle() {
  const t = activeTab();
  $('#title-text').textContent = t ? t.name : 'Termi';
  $('#title-sub').textContent = t ? focusedProc(t) : '';
  document.title = t ? `${t.name} | Termi` : 'Termi';
  $('#empty-state').hidden = state.tabs.length > 0;
  renderLayoutControl();
}

function renderPanes() {
  for (const tab of state.tabs) {
    if (tab.panes.length < 2) continue;
    for (const pane of tab.panes) {
      const name = commandLabel(pane.command) || pane.shellName;
      const busy = isBusy(pane);
      pane.box.classList.toggle('focused', pane === tab.focused);
      pane.ui.dot.className = `dot ${busy ? 'busy' : ''}`;
      pane.ui.name.textContent = name;
      pane.ui.name.title = pane.command || name;
      pane.ui.proc.textContent = busy && pane.proc !== name ? pane.proc : '';
    }
  }
}

const rows = {
  terminals: new Map(), // tab id -> row
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
    closeTab(id);
  });
  actions.append(close);
  item.append(dot, name, meta, kbd, actions);

  item.addEventListener('click', () => activate(id));
  item.addEventListener('dblclick', () => {
    const t = getTab(id);
    if (t) startRename(t, name);
  });
  return { item, dot, name, meta, kbd };
}

function updateTerminalRow(row, t, index) {
  row.item.classList.toggle('active', t.id === state.activeId);
  const cmd = t.commandId ? commandById(t.commandId) : null;
  row.item.title = cmd ? commandSummary(cmd) : t.name;
  row.dot.className = `dot ${t.activity ? 'activity' : t.panes.some(isBusy) ? 'busy' : ''}`;
  if (row.name.contentEditable !== 'true') row.name.textContent = t.name;
  const meta = focusedProc(t);
  row.meta.textContent = meta;
  row.meta.hidden = !meta;
  row.kbd.textContent = index < 9 ? `${modKey()}${index + 1}` : '';
  row.kbd.hidden = index >= 9;
}

function renderTerminals() {
  $('#running-count').textContent = state.tabs.length;
  syncList($('#terminal-list'), rows.terminals, state.tabs, buildTerminalRow, updateTerminalRow);
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
    if (t.id === state.activeId) t.focused.term.focus();
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
    if (running) closeTab(running.id);
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
  row.item.title = `${commandSummary(cmd)}${cmd.cwd ? `\nin ${cmd.cwd}` : ''}`;
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

const termFields = $('#term-fields');

function commandInputs() {
  return [...termFields.querySelectorAll('textarea')];
}

// One command box per terminal. With more than one, each box gets a number and a remove button.
function addCommandField(value = '') {
  if (termFields.children.length >= MAX_PANES) return null;
  const row = el('div', 'term-field');
  const number = el('span', 'term-field-num');
  const input = el('textarea');
  input.spellcheck = false;
  input.value = value;
  const remove = el('button', 'icon-btn small', ICONS.close);
  remove.type = 'button';
  remove.title = 'Remove this terminal';
  remove.addEventListener('click', () => {
    const inputs = commandInputs();
    const index = inputs.indexOf(input);
    row.remove();
    updateCommandFields();
    const next = commandInputs();
    next[Math.min(index, next.length - 1)]?.focus();
  });
  row.append(number, input, remove);
  termFields.append(row);
  updateCommandFields();
  return input;
}

function updateCommandFields() {
  const fields = [...termFields.children];
  const multi = fields.length > 1;
  termFields.classList.toggle('multi', multi);
  fields.forEach((row, index) => {
    row.querySelector('.term-field-num').textContent = index + 1;
    const input = row.querySelector('textarea');
    input.rows = multi ? 2 : 3;
    input.required = index === 0;
    input.placeholder = index === 0 ? 'npm run dev' : 'Leave empty for a plain shell';
    input.setAttribute('aria-label', multi ? `Command for terminal ${index + 1}` : 'Command');
  });
  $('#command-label').textContent = multi ? 'Commands' : 'Command';
  $('#add-term-field').hidden = fields.length >= MAX_PANES;
}

function openCommandDialog(cmd = null) {
  clearTimeout(dialogTimer);
  dialog.classList.remove('closing');
  editingId = cmd?.id ?? null;
  $('#command-dialog-title').textContent = cmd ? 'Edit saved command' : 'New saved command';
  form.elements.name.value = cmd?.name ?? '';
  termFields.replaceChildren();
  for (const t of cmd?.terminals ?? [{ command: '' }]) addCommandField(t.command);
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
    terminals: commandInputs().map((input) => ({ command: input.value.trim() })),
    cwd: form.elements.cwd.value.trim(),
    autoStart: form.elements.autoStart.checked,
  };
  if (!data.name || !data.terminals[0]?.command) return;

  const commands = editingId
    ? state.settings.commands.map((c) => (c.id === editingId ? { ...c, ...data } : c))
    : [...state.settings.commands, { id: uid(), ...data }];
  await saveSettings({ commands });

  // Keep the name of a running tab in step with its command.
  if (editingId) {
    for (const t of state.tabs) if (t.commandId === editingId) t.name = data.name;
  }
  closeCommandDialog();
  render();
});

// Cmd+Enter saves from inside a command box.
termFields.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    form.requestSubmit();
  }
});

$('#add-term-field').addEventListener('click', () => addCommandField()?.focus());

$('#cancel-command').addEventListener('click', closeCommandDialog);
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeCommandDialog();
});
dialog.addEventListener('close', () => {
  dialog.classList.remove('closing');
  activeTab()?.focused.term.focus();
});

$('#delete-command').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  if (!button.classList.contains('confirm')) {
    button.classList.add('confirm');
    button.textContent = 'Click again to delete';
    return;
  }
  await saveSettings({ commands: state.settings.commands.filter((c) => c.id !== editingId) });
  for (const t of state.tabs) if (t.commandId === editingId) t.commandId = null;
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
    fitTab(activeTab());
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
      fitTab(activeTab());
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
  'new-terminal': () => openTab(),
  'new-command': () => openCommandDialog(),
  'close-terminal': () => {
    if (dialog.open) closeCommandDialog();
    else if (state.activeId !== null) closeTab(state.activeId);
  },
  clear: () => activeTab()?.focused.term.clear(),
  'toggle-sidebar': toggleSidebar,
  'font-bigger': () => setFontSize(state.settings.fontSize + 1),
  'font-smaller': () => setFontSize(state.settings.fontSize - 1),
  'font-reset': () => setFontSize(DEFAULT_FONT_SIZE),
  'next-terminal': () => cycle(1),
  'prev-terminal': () => cycle(-1),
  'next-pane': () => cyclePane(1),
  'prev-pane': () => cyclePane(-1),
};

api.onMenuAction((action) => {
  const select = /^select-terminal-(\d)$/.exec(action);
  if (select) {
    const t = state.tabs[Number(select[1])];
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
  $('#add-terminal').addEventListener('click', () => openTab());
  $('#empty-new-terminal').addEventListener('click', () => openTab());
  $('#add-command').addEventListener('click', () => openCommandDialog());
  $('#empty-new-command').addEventListener('click', () => openCommandDialog());
  $('#commands-empty').addEventListener('click', () => openCommandDialog());

  let fitFrame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(fitFrame);
    if (layoutAnimating) return;
    fitFrame = requestAnimationFrame(() => fitTab(activeTab()));
  }).observe($('#terminals'));

  // Start saved commands marked auto-start. With none, open a plain shell.
  const autoStart = settings.commands.filter((c) => c.autoStart);
  if (autoStart.length) {
    for (const cmd of autoStart) await createTab(commandTabOptions(cmd));
    activate(state.tabs[0].id);
  } else {
    await openTab();
  }

  // Turn animations on only after the first layout, so the app does not animate into place.
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('preload')));
}

init();
