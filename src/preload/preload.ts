import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { TermiApi, Unsubscribe } from '../shared/types';

// Subscribe to a channel and return a function that removes the listener.
function listen<A extends unknown[]>(channel: string, callback: (...args: A) => void): Unsubscribe {
  const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...(args as A));
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: TermiApi = {
  info: () => ipcRenderer.invoke('app:info'),

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch) => ipcRenderer.invoke('settings:update', patch),
    onChange: (callback) => listen('settings:changed', callback),
  },

  pty: {
    create: (options) => ipcRenderer.invoke('pty:create', options),
    write: (id, data) => ipcRenderer.send('pty:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('pty:resize', id, cols, rows),
    kill: (id) => ipcRenderer.send('pty:kill', id),
    onData: (callback) => listen('pty:data', callback),
    onExit: (callback) => listen('pty:exit', callback),
    onTitle: (callback) => listen('pty:title', callback),
  },

  copyText: (text) => ipcRenderer.send('clipboard:write', text),

  onStats: (callback) => listen('stats:update', callback),

  pickFolder: (defaultPath) => ipcRenderer.invoke('dialog:pick-folder', defaultPath),

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    getState: () => ipcRenderer.invoke('window:get-state'),
    onState: (callback) => listen('window:state', callback),
  },

  onMenuAction: (callback) => listen('menu:action', callback),
};

contextBridge.exposeInMainWorld('termi', api);
