// A stand-in for the window.termi bridge the preload gives the page, for renderer tests in jsdom.
// Import it before anything from src/renderer, which reads window.termi when it loads.
import type { Settings, TermiApi } from '../../../src/shared/types';

const noop = () => {};
const subscribe = () => noop;
const settings: Settings = {
  commands: [],
  sidebarWidth: 232,
  sidebarHidden: false,
  fontSize: 13,
  guideSeen: true,
};

const api: TermiApi = {
  info: async () => ({ platform: 'linux', version: '0.1.0', home: '/home/test' }),
  settings: {
    get: async () => settings,
    update: async (patch) => ({ ...settings, ...patch }),
    onChange: subscribe,
  },
  pty: {
    create: async () => ({ id: 1, pid: 1, title: 'zsh' }),
    write: noop,
    resize: noop,
    kill: noop,
    onData: subscribe,
    onExit: subscribe,
    onTitle: subscribe,
  },
  copyText: noop,
  onStats: subscribe,
  pickFolder: async () => null,
  window: {
    minimize: noop,
    toggleMaximize: noop,
    close: noop,
    getState: async () => ({ isFullScreen: false, isMaximized: false, isFocused: true }),
    onState: subscribe,
  },
  onMenuAction: subscribe,
};

Object.defineProperty(window, 'termi', { value: api, configurable: true });
