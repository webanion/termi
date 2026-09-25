import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { EventChannels, InvokeChannels, SendChannels } from '../shared/ipc';
import type { TermiApi, Unsubscribe } from '../shared/types';

// Typed wrappers around ipcRenderer, so every channel and payload below matches shared/ipc.ts.
function invoke<C extends keyof InvokeChannels>(
  channel: C,
  ...args: InvokeChannels[C]['args']
): Promise<InvokeChannels[C]['result']> {
  return ipcRenderer.invoke(channel, ...args);
}

function send<C extends keyof SendChannels>(channel: C, ...args: SendChannels[C]): void {
  ipcRenderer.send(channel, ...args);
}

// Subscribe to a channel and return a function that removes the listener.
function listen<C extends keyof EventChannels>(
  channel: C,
  callback: (...args: EventChannels[C]) => void,
): Unsubscribe {
  const handler = (_event: IpcRendererEvent, ...args: unknown[]) =>
    callback(...(args as EventChannels[C]));
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: TermiApi = {
  info: () => invoke('app:info'),

  settings: {
    get: () => invoke('settings:get'),
    update: (patch) => invoke('settings:update', patch),
    onChange: (callback) => listen('settings:changed', callback),
  },

  pty: {
    create: (options) => invoke('pty:create', options),
    write: (id, data) => send('pty:write', id, data),
    resize: (id, cols, rows) => send('pty:resize', id, cols, rows),
    kill: (id) => send('pty:kill', id),
    onData: (callback) => listen('pty:data', callback),
    onExit: (callback) => listen('pty:exit', callback),
    onTitle: (callback) => listen('pty:title', callback),
  },

  copyText: (text) => send('clipboard:write', text),

  onStats: (callback) => listen('stats:update', callback),

  pickFolder: (defaultPath) => invoke('dialog:pick-folder', defaultPath),

  window: {
    minimize: () => send('window:minimize'),
    toggleMaximize: () => send('window:toggle-maximize'),
    close: () => send('window:close'),
    getState: () => invoke('window:get-state'),
    onState: (callback) => listen('window:state', callback),
  },

  onMenuAction: (callback) => listen('menu:action', callback),
};

contextBridge.exposeInMainWorld('termi', api);
