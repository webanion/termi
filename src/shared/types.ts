// Shapes that cross a process boundary: the settings file, and the API the preload exposes to
// the renderer as window.termi. Types only, so every process can import this file.

export interface SavedTerminal {
  command: string;
}

export interface SavedCommand {
  id: string;
  name: string;
  terminals: SavedTerminal[];
  cwd?: string;
  autoStart?: boolean;
  layout?: string;
}

// A saved command as older versions wrote it, with one `command` instead of `terminals`.
export type StoredCommand = Omit<SavedCommand, 'terminals'> & {
  terminals?: SavedTerminal[];
  command?: string;
};

export interface Settings {
  commands: SavedCommand[];
  sidebarWidth: number;
  sidebarHidden: boolean;
  fontSize: number;
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
    resize: (id: number, cols: number, rows: number) => void;
    kill: (id: number) => void;
    onData: (callback: (id: number, data: string) => void) => Unsubscribe;
    onExit: (callback: (id: number, exitCode: number) => void) => Unsubscribe;
    onTitle: (callback: (id: number, title: string) => void) => Unsubscribe;
  };
  copyText: (text: string) => void;
  onStats: (callback: (sample: StatsSample) => void) => Unsubscribe;
  pickFolder: (defaultPath?: string) => Promise<string | null>;
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    getState: () => Promise<WindowState>;
    onState: (callback: (state: WindowState) => void) => Unsubscribe;
  };
  onMenuAction: (callback: (action: string) => void) => Unsubscribe;
}
