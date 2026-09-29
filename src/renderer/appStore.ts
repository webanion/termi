// The renderer's state and every action that changes it, outside React. Components read it
// through useAppState. Most changes arrive from outside React (pty events, menu actions from
// main, MCP edits to the settings file), so the IPC listeners are registered here, once, in
// init(), never in a component.

import { fittingLayout, layoutIds, type Layout } from '@/shared/layouts';
import { MAX_TERMINALS } from '@/shared/savedCommands';
import type {
  AppInfo,
  PtyCreated,
  SavedCommand,
  SavedTerminal,
  Settings,
  WindowState,
} from '@/shared/types';
import {
  allRuntimes,
  createRuntime,
  forgetPtyData,
  getRuntime,
  routePtyData,
  runtimeForPty,
  type RuntimeEvents,
} from './terminalRuntime';
import {
  folderToOpen,
  MAX_DROPPED_TABS,
  pasteText,
  watchDrops,
  type DroppedItem,
} from './fileDrop';
import { DEFAULT_FONT_SIZE, DURATION, SIDEBAR_DEFAULT } from './theme';
import { issueUrl, releaseNotesUrl } from './helpLinks';
import { layoutGrid, tracksFor, type Axis, type TrackSizes } from './paneTracks';

const api = window.termi;

export interface PaneState {
  id: string;
  command: string;
  title?: string; // from its saved command, shown in the head in place of the command
  terminal?: number; // which of the saved command's terminals it runs, by index. A split has none.
  proc: string; // the program in the foreground
  shellName: string;
  attached: boolean; // its shell is running
}

// A tab holds 1 to 4 panes. A saved command can open several, and a split adds one more.
export interface TabState {
  id: number;
  name: string;
  customName: boolean;
  commandId: string | null;
  cwd: string | undefined; // the folder the tab's shells start in, and a split's shell too
  activity: boolean;
  layout: string | null;
  tracks: TrackSizes | null; // the sizes of a split's columns and rows, or null while equal
  panes: PaneState[];
  focusedPaneId: string | null;
  ready: boolean; // every pane's shell has started once, so the tab shows in the sidebar
}

export interface ClosingTab {
  tab: TabState;
  wasActive: boolean;
}

export interface DialogState {
  editingId: string | null;
  closing: boolean;
  token: number; // changes on every open, so the form starts fresh
}

export type Overlay = 'guide' | 'shortcuts' | 'palette' | 'launcher';

export interface AppState {
  info: AppInfo;
  settings: Settings;
  tabs: TabState[];
  activeId: number | null;
  leavingId: number | null; // the tab that was active and is fading out
  closing: ClosingTab[]; // closed tabs, kept while they fade out
  dialog: DialogState | null;
  overlay: Overlay | null; // the guide, the shortcut sheet, the command palette or the launcher
  guidePage: number;
  toast: { text: string; visible: boolean };
  sidebarDrop: boolean; // files are dragged over the sidebar
}

export interface TabOptions {
  name?: string;
  terminals?: SavedTerminal[];
  cwd?: string;
  commandId?: string;
  layout?: string;
}

let state: AppState = {
  info: { platform: 'darwin', version: '', home: '' },
  // Replaced by the saved settings in init().
  settings: {
    commands: [],
    sidebarWidth: SIDEBAR_DEFAULT,
    sidebarHidden: false,
    fontSize: DEFAULT_FONT_SIZE,
    guideSeen: true,
  },
  tabs: [],
  activeId: null,
  leavingId: null,
  closing: [],
  dialog: null,
  overlay: null,
  guidePage: 0,
  toast: { text: '', visible: false },
  sidebarDrop: false,
};

const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function updateTab(id: number, change: (tab: TabState) => TabState): void {
  setState({ tabs: state.tabs.map((t) => (t.id === id ? change(t) : t)) });
}

// ---------- Reading ----------

export const isMac = (info: AppInfo) => info.platform === 'darwin';

function tabById(id: number | null): TabState | undefined {
  return state.tabs.find((t) => t.id === id);
}

function tabOfPane(paneId: string): TabState | undefined {
  return state.tabs.find((t) => t.panes.some((p) => p.id === paneId));
}

export function activeTab(): TabState | undefined {
  return tabById(state.activeId);
}

// Tabs whose shells are running. The sidebar, the shortcuts and tab cycling count only these.
export function readyTabs(tabs: TabState[]): TabState[] {
  return tabs.filter((t) => t.ready);
}

export function layoutFor(tab: TabState): Layout | null {
  return fittingLayout(tab.panes.length, tab.layout) ?? null;
}

export function isBusy(pane: PaneState): boolean {
  const proc = (pane.proc || '').replace(/^-/, '');
  return Boolean(proc) && proc !== pane.shellName;
}

export function focusedPane(tab: TabState): PaneState | undefined {
  return tab.panes.find((p) => p.id === tab.focusedPaneId);
}

// The program running in the pane that has focus, when it is not the shell.
export function focusedProc(tab: TabState): string {
  const pane = focusedPane(tab);
  return pane && isBusy(pane) && pane.proc !== tab.name ? pane.proc : '';
}

export function commandById(id: string): SavedCommand | undefined {
  return state.settings.commands.find((c) => c.id === id);
}

export function runningFor(commandId: string): TabState | undefined {
  return state.tabs.find((t) => t.commandId === commandId);
}

export interface ClosedTerminal {
  terminal: number;
  command: string;
}

// The terminals of a tab's saved command that are not open in it, read from the saved command
// as it is now, like a fresh run: a terminal added since counts, and one removed since does not.
// A tab whose saved command was deleted has none.
export function closedTerminals(
  tab: TabState,
  commands: SavedCommand[] = state.settings.commands,
): ClosedTerminal[] {
  const cmd = tab.commandId ? commands.find((c) => c.id === tab.commandId) : undefined;
  if (!cmd) return [];
  const open = new Set(tab.panes.map((p) => p.terminal));
  return cmd.terminals
    .slice(0, MAX_TERMINALS)
    .flatMap((t, terminal) => (open.has(terminal) ? [] : [{ terminal, command: t.command }]));
}

// ---------- Terminals ----------

let nextTabId = 1;
let nextPaneId = 1;
let leavingTimer: ReturnType<typeof setTimeout> | undefined;
let selectingIn: string | null = null; // the pane where the last mouse press started

const runtimeEvents: RuntimeEvents = {
  // A program set the terminal title with an escape sequence.
  onTitle: (paneId, title) => {
    const tab = tabOfPane(paneId);
    if (tab && !tab.customName && title) updateTab(tab.id, (t) => ({ ...t, name: title }));
  },
  onPtyCreated: (paneId, created: PtyCreated) => {
    const tab = tabOfPane(paneId);
    if (!tab) return;
    updateTab(tab.id, (t) => {
      const panes = t.panes.map((p) =>
        p.id === paneId
          ? { ...p, proc: created.title, shellName: created.title, attached: true }
          : p,
      );
      const first = panes[0];
      const name = t.name || (first?.attached ? first.shellName : '');
      // A tab stays ready while a split's shell starts, so it does not leave the sidebar.
      return { ...t, panes, name, ready: t.ready || panes.every((p) => p.attached) };
    });
  },
};

function fitTab(id: number | null): void {
  for (const pane of tabById(id)?.panes ?? []) getRuntime(pane.id)?.fit();
}

function focusTab(id: number | null): void {
  const tab = tabById(id);
  const pane = tab && focusedPane(tab);
  if (pane) getRuntime(pane.id)?.focus();
}

export function fitActiveTab(): void {
  fitTab(state.activeId);
}

export function focusActiveTab(): void {
  focusTab(state.activeId);
}

// A pane's terminal takes focus when it first shows, if it is the focused pane of the tab on
// screen. Before that xterm has no element to focus.
export function focusIfCurrent(paneId: string): void {
  const tab = activeTab();
  if (tab && tab.focusedPaneId === paneId) getRuntime(paneId)?.focus();
}

// A pane and its runtime. An empty command opens a plain shell. The shell starts when the
// pane's terminal is first shown, at the size it has there.
function createPane(
  { command, title }: SavedTerminal,
  cwd: string | undefined,
  terminal?: number,
): PaneState {
  const pane: PaneState = {
    id: `p${nextPaneId++}`,
    command,
    ...(title ? { title } : {}),
    terminal,
    proc: '',
    shellName: '',
    attached: false,
  };
  createRuntime({
    paneId: pane.id,
    command,
    cwd,
    fontSize: state.settings.fontSize,
    events: runtimeEvents,
  });
  return pane;
}

// `terminals` has one entry per pane. In a saved command's tab, each pane remembers which of the
// command's terminals it runs, so a closed one can be reopened.
function createTab({
  name,
  terminals = [{ command: '' }],
  cwd,
  commandId,
  layout,
}: TabOptions = {}): TabState {
  const panes = terminals
    .slice(0, MAX_TERMINALS)
    .map((terminal, i) => createPane(terminal, cwd, commandId ? i : undefined));
  const tab: TabState = {
    id: nextTabId++,
    name: name || '',
    customName: Boolean(name),
    commandId: commandId || null,
    cwd,
    activity: false,
    layout: layout || null,
    tracks: null,
    panes,
    focusedPaneId: panes[0]?.id ?? null,
    ready: false,
  };
  setState({ tabs: [...state.tabs, tab] });
  return tab;
}

export function openTab(options?: TabOptions): TabState {
  const tab = createTab(options);
  activate(tab.id);
  return tab;
}

// The new tab fades in on top. The old one stays under it until the fade ends.
export function activate(id: number): void {
  const tab = tabById(id);
  if (!tab) return;
  const previous = state.activeId;
  const switching = previous !== null && previous !== id;
  setState({
    activeId: id,
    leavingId: switching ? previous : state.leavingId,
    tabs: tab.activity
      ? state.tabs.map((t) => (t.id === id ? { ...t, activity: false } : t))
      : state.tabs,
  });
  if (switching) {
    clearTimeout(leavingTimer);
    leavingTimer = setTimeout(() => setState({ leavingId: null }), DURATION);
  }
  requestAnimationFrame(() => {
    fitTab(id);
    focusTab(id);
  });
}

export function focusPane(paneId: string): void {
  const tab = tabOfPane(paneId);
  if (tab && tab.focusedPaneId !== paneId)
    updateTab(tab.id, (t) => ({ ...t, focusedPaneId: paneId }));
}

export function closeTab(id: number): void {
  const index = state.tabs.findIndex((t) => t.id === id);
  const tab = state.tabs[index];
  if (!tab) return;
  for (const pane of tab.panes) {
    getRuntime(pane.id)?.dispose(DURATION);
    if (selectingIn === pane.id) selectingIn = null;
  }
  const wasActive = state.activeId === id;
  const tabs = state.tabs.filter((t) => t.id !== id);
  const closing = [...state.closing, { tab, wasActive }];
  setTimeout(() => setState({ closing: state.closing.filter((c) => c.tab !== tab) }), DURATION);

  if (!wasActive) {
    setState({ tabs, closing });
    return;
  }
  setState({ tabs, closing, activeId: null, leavingId: null });
  const next = tabs[index] || tabs[index - 1];
  if (next) activate(next.id);
}

// Close one pane. The other panes of the tab take its space. The last pane closes the tab.
export function removePane(paneId: string): void {
  const tab = tabOfPane(paneId);
  if (!tab) return;
  if (tab.panes.length === 1) {
    closeTab(tab.id);
    return;
  }
  const index = tab.panes.findIndex((p) => p.id === paneId);
  getRuntime(paneId)?.dispose();
  if (selectingIn === paneId) selectingIn = null;
  const panes = tab.panes.filter((p) => p.id !== paneId);
  const focusedPaneId =
    tab.focusedPaneId === paneId
      ? ((panes[index] ?? panes[index - 1])?.id ?? null)
      : tab.focusedPaneId;
  updateTab(tab.id, (t) => ({
    ...t,
    panes,
    tracks: null,
    focusedPaneId,
    ready: t.ready || panes.every((p) => p.attached),
  }));
  if (tab.id === state.activeId) {
    requestAnimationFrame(() => {
      fitTab(tab.id);
      focusTab(tab.id);
    });
  }
}

// Add a plain shell to a tab, after its other panes, in the folder the tab started in. It
// takes focus once it shows. A split is never saved to the tab's saved command.
export function splitTab(id: number): void {
  const tab = tabById(id);
  if (!tab) return;
  if (tab.panes.length >= MAX_TERMINALS) {
    showToast(`A tab holds at most ${MAX_TERMINALS} terminals`);
    return;
  }
  const pane = createPane({ command: '' }, tab.cwd);
  updateTab(id, (t) => ({
    ...t,
    panes: [...t.panes, pane],
    tracks: null,
    focusedPaneId: pane.id,
  }));
  if (id === state.activeId) requestAnimationFrame(() => fitTab(id));
}

// A saved command's panes come first, in the order of its terminals, and splits follow them,
// since splitTab adds a pane at the end. A reopened pane goes before the first pane with a later
// terminal, or else after the last of the command's panes. So each terminal gets back the place
// in the layout a fresh run gives it, and the splits stay after the command's terminals.
function insertByTerminal(panes: PaneState[], pane: PaneState): PaneState[] {
  const terminal = pane.terminal ?? 0;
  let at = panes.findIndex((p) => p.terminal !== undefined && p.terminal > terminal);
  if (at < 0) at = panes.reduce((end, p, i) => (p.terminal === undefined ? end : i + 1), 0);
  return [...panes.slice(0, at), pane, ...panes.slice(at)];
}

// Reopen one closed terminal of a saved command's tab, or all of them. Each starts with the
// command and in the folder the saved command has now, like a fresh run, and goes back to its
// place. When the tab has no room for all of them, the first ones that fit open. The first
// reopened pane takes focus once it shows.
export function reopenTerminals(id: number, terminal?: number): void {
  const tab = tabById(id);
  const cmd = tab?.commandId ? commandById(tab.commandId) : undefined;
  if (!tab || !cmd) return;
  const wanted = closedTerminals(tab).filter(
    (c) => terminal === undefined || c.terminal === terminal,
  );
  if (!wanted.length) return;
  const room = MAX_TERMINALS - tab.panes.length;
  if (wanted.length > room) showToast(`A tab holds at most ${MAX_TERMINALS} terminals`);
  // Each reopened terminal gets its title back, as a fresh run gives it.
  const saved = commandTabOptions(cmd).terminals ?? [];
  const reopened = wanted
    .slice(0, Math.max(room, 0))
    .map((c) => createPane(saved[c.terminal] ?? { command: c.command }, cmd.cwd, c.terminal));
  const first = reopened[0];
  if (!first) return;
  updateTab(id, (t) => ({
    ...t,
    panes: reopened.reduce(insertByTerminal, t.panes),
    focusedPaneId: first.id,
  }));
  if (id === state.activeId) requestAnimationFrame(() => fitTab(id));
}

export function renameTab(id: number, name: string): void {
  updateTab(id, (t) => ({ ...t, name, customName: true }));
}

function cycle(step: number): void {
  const tabs = readyTabs(state.tabs);
  if (tabs.length < 2) return;
  const index = tabs.findIndex((t) => t.id === state.activeId);
  const next = tabs[(index + step + tabs.length) % tabs.length];
  if (next) activate(next.id);
}

function cyclePane(step: number): void {
  const tab = activeTab();
  if (!tab || tab.panes.length < 2) return;
  const index = tab.panes.findIndex((p) => p.id === tab.focusedPaneId);
  const next = tab.panes[(index + step + tab.panes.length) % tab.panes.length];
  if (next) getRuntime(next.id)?.focus();
}

function setFontSize(size: number): void {
  const fontSize = Math.min(28, Math.max(9, size));
  for (const runtime of allRuntimes()) runtime.term.options.fontSize = fontSize;
  fitActiveTab();
  void saveSettings({ fontSize });
}

export function setLayout(tabId: number, layoutId: string): void {
  const tab = tabById(tabId);
  if (!tab) return;
  updateTab(tabId, (t) => ({ ...t, layout: layoutId, tracks: null }));
  requestAnimationFrame(() => fitTab(tabId));
  // Remember the layout for the next time the saved command runs, unless a split or a closed
  // pane left the tab with another number of terminals than the command has.
  const cmd = tab.commandId ? commandById(tab.commandId) : undefined;
  if (cmd && cmd.terminals.length === tab.panes.length) {
    void saveSettings({
      commands: state.settings.commands.map((c) =>
        c.id === tab.commandId ? { ...c, layout: layoutId } : c,
      ),
    });
  }
}

// Resize the columns or the rows of a split tab. The sizes stay with the running tab, and go back
// to equal when its layout or its number of terminals changes.
export function resizeTracks(tabId: number, axis: Axis, sizes: number[]): void {
  const tab = tabById(tabId);
  const layout = tab && layoutFor(tab);
  if (!tab || !layout) return;
  const tracks = tracksFor(tab.tracks, layoutGrid(layout.areas));
  if (sizes.length !== tracks[axis].length) return;
  updateTab(tabId, (t) => ({ ...t, tracks: { ...tracks, [axis]: sizes } }));
  if (tabId === state.activeId) requestAnimationFrame(() => fitTab(tabId));
}

export function setSelecting(paneId: string): void {
  selectingIn = paneId;
}

// A right-click in a pane asks main for the terminal's menu. xterm has already focused the pane
// and, on macOS, selected the word under the mouse, so Copy acts on that word.
export function showTerminalMenu(paneId: string): void {
  const runtime = getRuntime(paneId);
  if (!runtime) return;
  api.showTerminalMenu({ hasSelection: runtime.term.hasSelection(), link: runtime.hoveredLink });
}

// ---------- Dropped files and folders ----------

// A drop on a terminal types the quoted paths into it, and focuses it. In a split tab that is
// the pane under the pointer, which need not be the focused one.
export function dropOnPane(paneId: string, items: DroppedItem[]): void {
  const runtime = getRuntime(paneId);
  if (!runtime || !items.length) return;
  focusPane(paneId);
  runtime.paste(pasteText(items.map((item) => item.path)));
  runtime.focus();
}

export function hoverSidebar(over: boolean): void {
  if (state.sidebarDrop !== over) setState({ sidebarDrop: over });
}

// A drop on the sidebar opens a terminal for each item, in the dropped folder or in the folder a
// dropped file is in. The last one opened becomes active, and the tab keeps the shell's name.
export function dropOnSidebar(items: DroppedItem[]): void {
  const opening = items.slice(0, MAX_DROPPED_TABS);
  let last: TabState | undefined;
  for (const item of opening) last = createTab({ cwd: folderToOpen(item) });
  if (last) activate(last.id);
  if (items.length > opening.length)
    showToast(
      `Opened ${opening.length} of ${items.length}. A drop opens at most ${MAX_DROPPED_TABS}.`,
    );
}

// ---------- Settings and saved commands ----------

async function saveSettings(patch: Partial<Settings>): Promise<void> {
  setState({ settings: await api.settings.update(patch) });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Titles name the terminals of a command with more than one. With 1, the name on the tab does.
function commandTabOptions(cmd: SavedCommand): TabOptions {
  const titled = cmd.terminals.length > 1;
  return {
    name: cmd.name,
    terminals: cmd.terminals.map((t) => ({
      command: t.command,
      title: titled ? t.title?.trim() : '',
    })),
    cwd: cmd.cwd,
    commandId: cmd.id,
    layout: cmd.layout,
  };
}

export function runCommand(cmd: SavedCommand): void {
  openTab(commandTabOptions(cmd));
}

export async function toggleAutoStart(cmd: SavedCommand): Promise<void> {
  const commands = state.settings.commands.map((c) =>
    c.id === cmd.id ? { ...c, autoStart: !c.autoStart } : c,
  );
  await saveSettings({ commands });
}

export interface CommandInput {
  name: string;
  terminals: SavedTerminal[];
  cwd: string;
  autoStart: boolean;
  layout?: string;
}

// Drop a layout that does not fit the command's number of terminals, as the MCP server does.
function withFittingLayout(cmd: SavedCommand): SavedCommand {
  const { layout, ...rest } = cmd;
  return layout && layoutIds(cmd.terminals.length)?.includes(layout) ? { ...rest, layout } : rest;
}

export async function saveCommand(editingId: string | null, data: CommandInput): Promise<void> {
  const commands = editingId
    ? state.settings.commands.map((c) =>
        c.id === editingId ? withFittingLayout({ ...c, ...data }) : c,
      )
    : [...state.settings.commands, withFittingLayout({ id: uid(), ...data })];
  await saveSettings({ commands });
  // Keep the name of a running tab in step with its command.
  if (editingId) {
    setState({
      tabs: state.tabs.map((t) => (t.commandId === editingId ? { ...t, name: data.name } : t)),
    });
  }
}

export async function deleteCommand(id: string): Promise<void> {
  await saveSettings({ commands: state.settings.commands.filter((c) => c.id !== id) });
  setState({
    tabs: state.tabs.map((t) => (t.commandId === id ? { ...t, commandId: null } : t)),
  });
}

// ---------- Command dialog ----------

let dialogToken = 0;
let dialogTimer: ReturnType<typeof setTimeout> | undefined;

export function openCommandDialog(cmd: SavedCommand | null = null): void {
  clearTimeout(dialogTimer);
  dialogToken += 1;
  setState({ dialog: { editingId: cmd?.id ?? null, closing: false, token: dialogToken } });
}

// Play the closing animation, then close.
export function closeCommandDialog(): void {
  const { dialog } = state;
  if (!dialog || dialog.closing) return;
  setState({ dialog: { ...dialog, closing: true } });
  dialogTimer = setTimeout(() => setState({ dialog: null }), DURATION);
}

// ---------- Sidebar and window ----------

let layoutAnimating = false; // true while the sidebar slides, so terminals refit once at the end
let layoutTimer: ReturnType<typeof setTimeout> | undefined;

export function isLayoutAnimating(): boolean {
  return layoutAnimating;
}

// Refitting on every frame of a slide would resize the shell many times. Fit once at the end.
function animateLayout(): void {
  layoutAnimating = true;
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(() => {
    layoutAnimating = false;
    fitActiveTab();
  }, DURATION + 20);
}

function applySidebar(): void {
  animateLayout();
  document.body.classList.toggle('sidebar-hidden', state.settings.sidebarHidden);
  document.documentElement.style.setProperty('--sidebar-w', `${state.settings.sidebarWidth}px`);
}

export function toggleSidebar(): void {
  void saveSettings({ sidebarHidden: !state.settings.sidebarHidden }).then(applySidebar);
}

export function saveSidebarWidth(width: number): void {
  void saveSettings({ sidebarWidth: width });
  fitActiveTab();
}

export function resetSidebarWidth(): void {
  void saveSettings({ sidebarWidth: SIDEBAR_DEFAULT }).then(applySidebar);
}

// On macOS, a double-click on an empty part of a header zooms the window, like a native title
// bar. Other systems do that themselves on the header's drag region, and a toggle here as well
// would undo it.
export function zoomFromHeader(target: EventTarget | null): void {
  if (!isMac(state.info)) return;
  if (target instanceof Element && target.closest('button')) return;
  api.window.toggleMaximize();
}

function applyWindowState({ isFullScreen, isFocused }: WindowState): void {
  document.body.classList.toggle('fullscreen', Boolean(isFullScreen) && isMac(state.info));
  document.body.classList.toggle('blurred', !isFocused);
}

// ---------- Toast ----------

let toastTimer: ReturnType<typeof setTimeout> | undefined;

function showToast(text: string): void {
  setState({ toast: { text, visible: true } });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setState({ toast: { ...state.toast, visible: false } }), 1400);
}

// ---------- Help ----------

const OVERLAYS: Record<string, Overlay> = {
  'show-guide': 'guide',
  'show-shortcuts': 'shortcuts',
  'command-palette': 'palette',
  'run-saved-command': 'launcher',
};

export function openOverlay(overlay: Overlay): void {
  if (state.dialog) closeCommandDialog();
  setState({ overlay });
  if (overlay === 'guide' && !state.settings.guideSeen) void saveSettings({ guideSeen: true });
}

export function closeOverlay(): void {
  if (!state.overlay) return;
  setState({ overlay: null });
  focusActiveTab();
}

export function setGuidePage(page: number): void {
  setState({ guidePage: page });
}

function shellName(): string {
  const tab = activeTab() ?? state.tabs[0];
  return tab ? (focusedPane(tab)?.shellName ?? '') : '';
}

// ---------- Menu actions ----------

const menuActions: Record<string, () => unknown> = {
  'new-terminal': () => openTab(),
  'split-terminal': () => {
    if (state.activeId !== null) splitTab(state.activeId);
  },
  'reopen-terminals': () => {
    if (state.activeId !== null) reopenTerminals(state.activeId);
  },
  'new-command': () => openCommandDialog(),
  'close-terminal': () => {
    if (state.dialog) closeCommandDialog();
    else if (state.activeId !== null) closeTab(state.activeId);
  },
  clear: () => {
    const tab = activeTab();
    const pane = tab && focusedPane(tab);
    if (pane) getRuntime(pane.id)?.term.clear();
  },
  'select-all': () => {
    const tab = activeTab();
    const pane = tab && focusedPane(tab);
    if (pane) getRuntime(pane.id)?.term.selectAll();
  },
  'toggle-sidebar': toggleSidebar,
  'font-bigger': () => setFontSize(state.settings.fontSize + 1),
  'font-smaller': () => setFontSize(state.settings.fontSize - 1),
  'font-reset': () => setFontSize(DEFAULT_FONT_SIZE),
  'next-terminal': () => cycle(1),
  'prev-terminal': () => cycle(-1),
  'next-pane': () => cyclePane(1),
  'prev-pane': () => cyclePane(-1),
  'report-issue': () => window.open(issueUrl(state.info, shellName())),
  'release-notes': () => window.open(releaseNotesUrl(state.info.version)),
};

// Run an action from the menu, a shortcut or the command palette. An action that opens the help
// already showing closes it instead, and any other closes the help first.
export function runAction(action: string): void {
  const overlay = OVERLAYS[action];
  if (overlay) {
    if (state.overlay === overlay) closeOverlay();
    else openOverlay(overlay);
    return;
  }
  if (state.overlay) {
    closeOverlay();
    if (action === 'close-terminal') return;
  }
  const select = /^select-terminal-(\d)$/.exec(action);
  if (select) {
    const t = readyTabs(state.tabs)[Number(select[1])];
    if (t) activate(t.id);
    return;
  }
  menuActions[action]?.();
}

// ---------- Start-up ----------

// Runs once, before React renders: load the app info and settings, listen to main, and start
// the saved commands marked auto-start, or one plain shell when there are none.
export async function init(): Promise<void> {
  const [info, settings, windowState] = await Promise.all([
    api.info(),
    api.settings.get(),
    api.window.getState(),
  ]);
  setState({ info, settings });
  document.body.classList.add(`platform-${info.platform}`);
  applySidebar();
  applyWindowState(windowState);

  api.window.onState(applyWindowState);
  api.onMenuAction(runAction);
  api.settings.onChange((next) => {
    // The MCP server changed the saved commands. Keep running tabs in step, like a save from
    // the dialog.
    setState({
      settings: next,
      tabs: state.tabs.map((t) => {
        if (!t.commandId) return t;
        const cmd = next.commands.find((c) => c.id === t.commandId);
        return cmd ? { ...t, name: cmd.name } : { ...t, commandId: null };
      }),
    });
  });
  api.pty.onData((id, data) => {
    const runtime = routePtyData(id, data);
    const tab = runtime && tabOfPane(runtime.paneId);
    if (tab && tab.id !== state.activeId && !tab.activity)
      updateTab(tab.id, (t) => ({ ...t, activity: true }));
  });
  api.pty.onTitle((id, title) => {
    const runtime = runtimeForPty(id);
    const tab = runtime && tabOfPane(runtime.paneId);
    if (!runtime || !tab) return;
    updateTab(tab.id, (t) => ({
      ...t,
      panes: t.panes.map((p) => (p.id === runtime.paneId ? { ...p, proc: title } : p)),
    }));
  });
  api.pty.onExit((id) => {
    forgetPtyData(id);
    const runtime = runtimeForPty(id);
    if (runtime) removePane(runtime.paneId);
  });

  // Select to copy. Listen on the document, because a drag can end outside the terminal.
  document.addEventListener('mouseup', () => {
    const runtime = selectingIn ? getRuntime(selectingIn) : undefined;
    selectingIn = null;
    if (!runtime) return;
    // Wait a moment, so xterm has finished word and line selection on double and triple click.
    setTimeout(() => {
      if (!runtime.term.hasSelection()) return;
      const text = runtime.term.getSelection();
      if (!text.trim()) return;
      api.copyText(text);
      showToast('Copied to clipboard');
    });
  });

  // Files and folders dropped anywhere in the window.
  watchDrops({ hoverSidebar, dropOnPane, dropOnSidebar }, (file) => api.pathForFile(file));

  const autoStart = settings.commands.filter((c) => c.autoStart);
  if (autoStart.length) {
    for (const cmd of autoStart) createTab(commandTabOptions(cmd));
    const first = state.tabs[0];
    if (first) activate(first.id);
  } else {
    openTab();
  }
  // The guide opens by itself once, on the first launch.
  if (!settings.guideSeen) openOverlay('guide');
}

// This module holds the live state and the IPC listeners. Hot-swapping it would leave
// components on a copy with neither, so an edit to it reloads the page instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
