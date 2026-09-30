// Shapes that cross a process boundary: the settings file, and the API the preload exposes to
// the renderer as window.termi. Types only, so every process can import this file.

export interface SavedTerminal {
  command: string;
  title?: string; // shown in the pane head instead of the command, for 2 or more terminals
}

// How a tab shows 2 to 4 terminals: all at once in a layout, or one at a time behind tabs.
export type PaneView = 'split' | 'tabs';

export interface SavedCommand {
  id: string;
  name: string;
  terminals: SavedTerminal[];
  cwd?: string;
  autoStart?: boolean;
  layout?: string;
  view?: PaneView; // left out for split, the default
}

// A saved command as older versions wrote it, with one `command` instead of `terminals`.
export type StoredCommand = Omit<SavedCommand, 'terminals'> & {
  terminals?: SavedTerminal[];
  command?: string;
};

export type CursorStyle = 'bar' | 'block' | 'underline';

export interface Settings {
  commands: SavedCommand[];
  sidebarWidth: number;
  sidebarHidden: boolean;
  fontSize: number;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  smoothScroll: boolean; // a mouse wheel scrolls in a short animation
  wordWrap: boolean; // whether a new terminal wraps long lines
  guideSeen: boolean; // the guide opens by itself once, on the first launch
}

export interface AppInfo {
  version: string;
  platform: string;
  home: string;
}

export interface PtyCreateOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
  command?: string;
}

export interface PtyCreated {
  id: number;
  pid: number;
  title: string;
}

export interface StatsSample {
  cpu: number;
  memUsed: number | null;
  memTotal: number | null;
  down: number | null;
  up: number | null;
}

export interface WindowState {
  isFullScreen: boolean;
  isMaximized: boolean;
  isFocused: boolean;
}

// A right-click in a terminal: whether it has a selection, and the web link under the mouse.
export interface TerminalContext {
  hasSelection: boolean;
  link: string | null;
}

export type Unsubscribe = () => void;

export interface TermiApi {
  info: () => Promise<AppInfo>;
  settings: {
    get: () => Promise<Settings>;
    update: (patch: Partial<Settings>) => Promise<Settings>;
    onChange: (callback: (settings: Settings) => void) => Unsubscribe;
  };
  pty: {
    create: (options: PtyCreateOptions) => Promise<PtyCreated>;
    write: (id: number, data: string) => void;
    writeBinary: (id: number, data: string) => void;
    resize: (id: number, cols: number, rows: number) => void;
    kill: (id: number) => void;
    onData: (callback: (id: number, data: string) => void) => Unsubscribe;
    onExit: (callback: (id: number, exitCode: number) => void) => Unsubscribe;
    onTitle: (callback: (id: number, title: string) => void) => Unsubscribe;
  };
  copyText: (text: string) => void;
  showTerminalMenu: (context: TerminalContext) => void;
  onStats: (callback: (sample: StatsSample) => void) => Unsubscribe;
  pickFolder: (defaultPath?: string) => Promise<string | null>;
  // Whether Termi opens at login, or null on a system where Termi cannot set that.
  loginItem: {
    get: () => Promise<boolean | null>;
    set: (open: boolean) => Promise<boolean | null>;
  };
  pathForFile: (file: File) => string;
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    getState: () => Promise<WindowState>;
    onState: (callback: (state: WindowState) => void) => Unsubscribe;
  };
  setWordWrapMenu: (on: boolean) => void;
  onMenuAction: (callback: (action: string) => void) => Unsubscribe;
}
