// Every IPC channel between main and the renderer, with what it carries. Main registers its
// handlers against these maps and the preload builds window.termi from them, so a channel that
// is renamed or changes shape is a type error on both sides.

import type {
  AppInfo,
  PtyCreateOptions,
  PtyCreated,
  Settings,
  StatsSample,
  TerminalContext,
  WindowState,
} from './types';

// Requests the renderer makes and main answers: ipcRenderer.invoke and ipcMain.handle.
export interface InvokeChannels {
  'app:info': { args: []; result: AppInfo };
  'settings:get': { args: []; result: Settings };
  'settings:update': { args: [patch: Partial<Settings>]; result: Settings };
  'pty:create': { args: [options: PtyCreateOptions]; result: PtyCreated };
  'dialog:pick-folder': { args: [defaultPath?: string]; result: string | null };
  'login-item:get': { args: []; result: boolean | null };
  'login-item:set': { args: [open: boolean]; result: boolean | null };
  'window:get-state': { args: []; result: WindowState };
}

// Messages the renderer sends without waiting for an answer: ipcRenderer.send and ipcMain.on.
export interface SendChannels {
  'pty:write': [id: number, data: string];
  // Bytes, one per character from 0 to 255, such as a mouse report in the X10 encoding.
  'pty:write-binary': [id: number, data: string];
  'pty:resize': [id: number, cols: number, rows: number];
  'pty:kill': [id: number];
  'clipboard:write': [text: string];
  'terminal:context-menu': [context: TerminalContext];
  'window:minimize': [];
  'window:toggle-maximize': [];
  'window:close': [];
}

// Events main pushes to the renderer: webContents.send and ipcRenderer.on.
export interface EventChannels {
  'settings:changed': [settings: Settings];
  'pty:data': [id: number, data: string];
  'pty:exit': [id: number, exitCode: number];
  'pty:title': [id: number, title: string];
  'stats:update': [sample: StatsSample];
  'window:state': [state: WindowState];
  'menu:action': [action: string];
}

export type SendEvent = <C extends keyof EventChannels>(
  channel: C,
  ...args: EventChannels[C]
) => void;
