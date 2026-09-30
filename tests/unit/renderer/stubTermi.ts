// A stand-in for the window.termi bridge the preload gives the page, for renderer tests in jsdom.
// Import it before anything from src/renderer, which reads window.termi when it loads.
import type { Settings, TermiApi } from '@/shared/types';

const noop = () => {};
const subscribe = () => noop;
const settings: Settings = {
  commands: [],
  sidebarWidth: 232,
  sidebarHidden: false,
  fontSize: 13,
  cursorStyle: 'bar',
  cursorBlink: true,
  smoothScroll: true,
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
    writeBinary: noop,
    resize: noop,
    kill: noop,
    onData: subscribe,
    onExit: subscribe,
    onTitle: subscribe,
  },
  copyText: noop,
  showTerminalMenu: noop,
  onStats: subscribe,
  pickFolder: async () => null,
  loginItem: { get: async () => null, set: async () => null },
  pathForFile: () => '',
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
