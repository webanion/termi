import { app, nativeImage, type BrowserWindow } from 'electron';
import { APP_ICON, createWindow } from './window';
import { buildMenu } from './menu';
import { registerIpc } from './ipc';
import { watchSettings } from './settings';
import { PtyManager } from './ptyManager';
import { SystemStats } from './systemStats';
import type { SendEvent } from '../shared/ipc';

app.setName('Termi');
// Lets tests and development runs keep their data apart from the real app.
if (process.env.TERMI_USER_DATA) app.setPath('userData', process.env.TERMI_USER_DATA);

let mainWindow: BrowserWindow | null = null;
let ptys: PtyManager | null = null;

const sendToRenderer: SendEvent = (channel, ...args) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args);
};

function openWindow(terminals: PtyManager, stats: SystemStats): void {
  const win = createWindow(terminals, stats, sendToRenderer);
  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock?.setIcon(nativeImage.createFromPath(APP_ICON));
  }
  app.setAboutPanelOptions({
    applicationName: 'Termi',
    applicationVersion: app.getVersion(),
    copyright: 'A terminal with saved commands and auto-start.',
    iconPath: APP_ICON,
  });

  const terminals = new PtyManager(sendToRenderer);
  const stats = new SystemStats((sample) => sendToRenderer('stats:update', sample));
  ptys = terminals;
  registerIpc(terminals, () => mainWindow);
  watchSettings((settings) => sendToRenderer('settings:changed', settings));
  buildMenu(sendToRenderer);
  openWindow(terminals, stats);

  app.on('activate', () => {
    if (!mainWindow) openWindow(terminals, stats);
  });
});

// The terminals belong to the window, so closing it quits the app.
app.on('window-all-closed', () => app.quit());

// Runs after the window closed, so the quit prompt sees the live terminals.
app.on('will-quit', () => {
  ptys?.killAll();
});
