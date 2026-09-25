// The renderer's state and every action that changes it, outside React. Components read it
// through useAppState. Most changes arrive from outside React (pty events, menu actions from
// main, MCP edits to the settings file), so the IPC listeners are registered here, once, in
// init(), never in a component.

import { LAYOUTS, type Layout } from '../shared/layouts';
import { MAX_TERMINALS } from '../shared/savedCommands';
import type { AppInfo, PtyCreated, SavedCommand, Settings, WindowState } from '../shared/types';
import {
  allRuntimes,
  createRuntime,
  forgetPtyData,
  getRuntime,
  routePtyData,
  runtimeForPty,
  type RuntimeEvents,
} from './terminalRuntime';
import { DEFAULT_FONT_SIZE, DURATION, SIDEBAR_DEFAULT } from './theme';

const api = window.termi;

export interface PaneState {
  id: string;
  command: string;
  proc: string; // the program in the foreground
  shellName: string;
  attached: boolean; // its shell is running
}

// A tab holds 1 to 4 panes. Only a saved command opens more than one.
export interface TabState {
  id: number;
  name: string;
  customName: boolean;
  commandId: string | null;
  activity: boolean;
  layout: string | null;
  panes: PaneState[];
  focusedPaneId: string | null;
  ready: boolean; // every pane's shell is running, so the tab shows in the sidebar
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

export interface AppState {
  info: AppInfo;
  settings: Settings;
  tabs: TabState[];
  activeId: number | null;
  leavingId: number | null; // the tab that was active and is fading out
  closing: ClosingTab[]; // closed tabs, kept while they fade out
  dialog: DialogState | null;
  toast: { text: string; visible: boolean };
}

export interface TabOptions {
  name?: string;
  commands?: string[];
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
  },
  tabs: [],
  activeId: null,
  leavingId: null,
  closing: [],
  dialog: null,
  toast: { text: '', visible: false },
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
export const modKey = (info: AppInfo) => (isMac(info) ? '⌘' : 'Ctrl+');

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
  const options = LAYOUTS[tab.panes.length];
  if (!options) return null;
  return options.find((l) => l.id === tab.layout) || options[0] || null;
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
      return { ...t, panes, name, ready: panes.every((p) => p.attached) };
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

// `commands` has one entry per pane. An empty command opens a plain shell. Each pane's shell
// starts when its terminal is first shown, at the size it has there.
function createTab({ name, commands = [''], cwd, commandId, layout }: TabOptions = {}): TabState {
  const panes = commands.slice(0, MAX_TERMINALS).map((command) => {
    const pane: PaneState = {
      id: `p${nextPaneId++}`,
      command,
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
  });
  const tab: TabState = {
    id: nextTabId++,
    name: name || '',
    customName: Boolean(name),
    commandId: commandId || null,
    activity: false,
    layout: layout || null,
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
    focusedPaneId,
    ready: panes.every((p) => p.attached),
  }));
  if (tab.id === state.activeId) {
    requestAnimationFrame(() => {
      fitTab(tab.id);
      focusTab(tab.id);
    });
  }
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
  updateTab(tabId, (t) => ({ ...t, layout: layoutId }));
  requestAnimationFrame(() => fitTab(tabId));
  // Remember the layout for the next time the saved command runs.
  if (tab.commandId && commandById(tab.commandId)) {
    void saveSettings({
      commands: state.settings.commands.map((c) =>
        c.id === tab.commandId ? { ...c, layout: layoutId } : c,
      ),
    });
  }
}

export function setSelecting(paneId: string): void {
  selectingIn = paneId;
}

// ---------- Settings and saved commands ----------

async function saveSettings(patch: Partial<Settings>): Promise<void> {
  setState({ settings: await api.settings.update(patch) });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function commandTabOptions(cmd: SavedCommand): TabOptions {
  return {
    name: cmd.name,
    commands: cmd.terminals.map((t) => t.command),
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
  terminals: { command: string }[];
  cwd: string;
  autoStart: boolean;
}

export async function saveCommand(editingId: string | null, data: CommandInput): Promise<void> {
  const commands = editingId
    ? state.settings.commands.map((c) => (c.id === editingId ? { ...c, ...data } : c))
    : [...state.settings.commands, { id: uid(), ...data }];
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

// Double-click on an empty part of a header zooms the window, like a native title bar.
export function zoomFromHeader(target: EventTarget | null): void {
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

// ---------- Menu actions ----------

const menuActions: Record<string, () => unknown> = {
  'new-terminal': () => openTab(),
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
  'toggle-sidebar': toggleSidebar,
  'font-bigger': () => setFontSize(state.settings.fontSize + 1),
  'font-smaller': () => setFontSize(state.settings.fontSize - 1),
  'font-reset': () => setFontSize(DEFAULT_FONT_SIZE),
  'next-terminal': () => cycle(1),
  'prev-terminal': () => cycle(-1),
  'next-pane': () => cyclePane(1),
  'prev-pane': () => cyclePane(-1),
};

function onMenuAction(action: string): void {
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
  api.onMenuAction(onMenuAction);
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

  const autoStart = settings.commands.filter((c) => c.autoStart);
  if (autoStart.length) {
    for (const cmd of autoStart) createTab(commandTabOptions(cmd));
    const first = state.tabs[0];
    if (first) activate(first.id);
  } else {
    openTab();
  }
}

// This module holds the live state and the IPC listeners. Hot-swapping it would leave
// components on a copy with neither, so an edit to it reloads the page instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
