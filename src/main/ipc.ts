import {
  app,
  clipboard,
  dialog,
  ipcMain,
  type BrowserWindow,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
} from 'electron';
import { getSettings, updateSettings } from './settings';
import { isAppPage } from './window';
import { cleanSettingsPatch } from '../shared/settings';
import { isRecord } from '../shared/savedCommands';
import type { PtyManager } from './ptyManager';
import type { InvokeChannels, SendChannels } from '../shared/ipc';
import type { PtyCreateOptions } from '../shared/types';

// Arguments from the renderer arrive as unknown and are checked here before main uses them.
type Handler<C extends keyof InvokeChannels> = (
  event: IpcMainInvokeEvent,
  ...args: unknown[]
) => InvokeChannels[C]['result'] | Promise<InvokeChannels[C]['result']>;
type Listener = (event: IpcMainEvent, ...args: unknown[]) => void;

const MAX_SIZE = 10_000; // columns or rows
const MAX_PATH = 4096;
const MAX_COMMAND = 64 * 1024;

const isInteger = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

const isOptionalString = (value: unknown, max: number): value is string | undefined =>
  value === undefined || (typeof value === 'string' && value.length <= max);

function ptyOptions(value: unknown): PtyCreateOptions {
  if (!isRecord(value)) throw new TypeError('pty:create needs an options object.');
  const { cols, rows, cwd, command } = value;
  if (cols !== undefined && !isInteger(cols, 1, MAX_SIZE)) throw new TypeError('Bad cols.');
  if (rows !== undefined && !isInteger(rows, 1, MAX_SIZE)) throw new TypeError('Bad rows.');
  if (!isOptionalString(cwd, MAX_PATH)) throw new TypeError('Bad cwd.');
  if (!isOptionalString(command, MAX_COMMAND)) throw new TypeError('Bad command.');
  return { cols, rows, cwd, command };
}

export function registerIpc(ptys: PtyManager, getWindow: () => BrowserWindow | null): void {
  // Only the app's own page, as the top frame of the app's window, may call main.
  const fromAppPage = (event: IpcMainEvent | IpcMainInvokeEvent): boolean => {
    const win = getWindow();
    const frame = event.senderFrame;
    return Boolean(
      win &&
      frame &&
      event.sender.id === win.webContents.id &&
      frame.parent === null &&
      isAppPage(frame.url),
    );
  };

  function handle<C extends keyof InvokeChannels>(channel: C, handler: Handler<C>): void {
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      if (!fromAppPage(event)) throw new Error(`Refused ${channel} from outside the app's page.`);
      return handler(event, ...args);
    });
  }

  function on<C extends keyof SendChannels>(channel: C, listener: Listener): void {
    ipcMain.on(channel, (event, ...args: unknown[]) => {
      if (fromAppPage(event)) listener(event, ...args);
    });
  }

  handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    home: app.getPath('home'),
  }));

  handle('settings:get', () => getSettings());
  handle('settings:update', (_event, patch) => updateSettings(cleanSettingsPatch(patch)));

  handle('pty:create', (event, options) => ptys.create(ptyOptions(options), event.sender.id));
  on('pty:write', (_event, id, data) => {
    if (isInteger(id, 1, Number.MAX_SAFE_INTEGER) && typeof data === 'string') ptys.write(id, data);
  });
  on('pty:resize', (_event, id, cols, rows) => {
    if (
      isInteger(id, 1, Number.MAX_SAFE_INTEGER) &&
      isInteger(cols, 1, MAX_SIZE) &&
      isInteger(rows, 1, MAX_SIZE)
    )
      ptys.resize(id, cols, rows);
  });
  on('pty:kill', (_event, id) => {
    if (isInteger(id, 1, Number.MAX_SAFE_INTEGER)) ptys.kill(id);
  });

  on('clipboard:write', (_event, text) => {
    if (typeof text === 'string' && text) clipboard.writeText(text);
  });

  handle('dialog:pick-folder', async (_event, defaultPath) => {
    if (!isOptionalString(defaultPath, MAX_PATH)) throw new TypeError('Bad default path.');
    const options: Electron.OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: defaultPath || app.getPath('home'),
    };
    const win = getWindow();
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  on('window:minimize', () => getWindow()?.minimize());
  on('window:toggle-maximize', () => {
    const win = getWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  on('window:close', () => getWindow()?.close());
  handle('window:get-state', () => {
    const win = getWindow();
    return {
      isFullScreen: win?.isFullScreen() ?? false,
      isMaximized: win?.isMaximized() ?? false,
      isFocused: win?.isFocused() ?? true,
    };
  });
}
