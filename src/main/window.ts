import path from 'path';
import { pathToFileURL } from 'url';
import { app, BrowserWindow, dialog, shell } from 'electron';
import { loadWindowState, trackWindowState } from './windowState';
import type { PtyManager } from './ptyManager';
import type { SystemStats } from './systemStats';
import type { SendEvent } from '../shared/ipc';

const isMac = process.platform === 'darwin';
const HEADER_HEIGHT = 40;

export const APP_ICON = path.join(__dirname, '..', '..', 'assets', 'icon.png');

// `npm run dev` serves the renderer with hot reload. Everything else loads the built files.
const DEV_URL = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL;
const PAGE_URL = pathToFileURL(path.join(__dirname, '..', 'renderer', 'index.html')).href;

// True when a URL is the app's own page, the one this window loads.
export function isAppPage(url: string): boolean {
  return url.startsWith(DEV_URL ?? PAGE_URL);
}

let quitConfirmed = false;

export function createWindow(ptys: PtyManager, stats: SystemStats, send: SendEvent): BrowserWindow {
  const state = loadWindowState();

  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 480,
    minHeight: 320,
    show: false,
    title: 'Termi',
    icon: APP_ICON,
    backgroundColor: '#262624',
    // macOS keeps its real traffic lights, placed inside our own header.
    // Other systems get a frameless window and the header draws them.
    ...(isMac
      ? {
          titleBarStyle: 'hidden' as const,
          trafficLightPosition: { x: 14, y: (HEADER_HEIGHT - 16) / 2 },
        }
      : { frame: false }),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const contentsId = win.webContents.id;

  if (state.isMaximized) win.maximize();
  if (state.isFullScreen) win.setFullScreen(true);
  trackWindowState(win);

  win.once('ready-to-show', () => win.show());
  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadURL(PAGE_URL);

  const sendWindowState = () =>
    send('window:state', {
      isFullScreen: win.isFullScreen(),
      isMaximized: win.isMaximized(),
      isFocused: win.isFocused(),
    });
  win.on('enter-full-screen', sendWindowState);
  win.on('leave-full-screen', sendWindowState);
  win.on('maximize', sendWindowState);
  win.on('unmaximize', sendWindowState);
  win.on('focus', sendWindowState);
  win.on('blur', sendWindowState);

  // Sample system stats only while someone can see them.
  win.on('show', () => stats.start());
  win.on('restore', () => stats.start());
  win.on('hide', () => stats.stop());
  win.on('minimize', () => stats.stop());

  // Open links from the terminal in the default browser, never in the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  // A reload starts a new page that opens its own terminals, so stop the ones the old page
  // opened. The same when the page's process dies.
  win.webContents.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) ptys.killOwnedBy(contentsId);
  });
  win.webContents.on('render-process-gone', () => ptys.killOwnedBy(contentsId));

  win.on('close', (event) => {
    if (quitConfirmed) return;
    const busy = ptys.busyCount();
    if (busy === 0) return;
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['Quit', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      message: 'Quit Termi?',
      detail:
        busy === 1
          ? 'A program is still running in 1 terminal. Quitting will stop it.'
          : `Programs are still running in ${busy} terminals. Quitting will stop them.`,
    });
    if (choice === 1) event.preventDefault();
    else quitConfirmed = true;
  });

  win.on('closed', () => stats.stop());
  return win;
}
