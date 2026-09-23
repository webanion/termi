const path = require('path');
const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage, clipboard } = require('electron');
const { loadWindowState, trackWindowState } = require('./window-state');
const { getSettings, updateSettings } = require('./settings');
const { PtyManager } = require('./pty-manager');
const { SystemStats } = require('./system-stats');

const isMac = process.platform === 'darwin';
const ASSETS = path.join(__dirname, '..', '..', 'assets');
const APP_ICON = path.join(ASSETS, 'icon.png');
const HEADER_HEIGHT = 40;

app.setName('Termi');
// Lets tests and development runs keep their data apart from the real app.
if (process.env.TERMI_USER_DATA) app.setPath('userData', process.env.TERMI_USER_DATA);

let mainWindow = null;
let ptys = null;
let stats = null;
let quitConfirmed = false;

function sendToRenderer(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args);
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
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
      ? { titleBarStyle: 'hidden', trafficLightPosition: { x: 14, y: (HEADER_HEIGHT - 16) / 2 } }
      : { frame: false }),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (state.isMaximized) mainWindow.maximize();
  if (state.isFullScreen) mainWindow.setFullScreen(true);
  trackWindowState(mainWindow);

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  const sendWindowState = () =>
    sendToRenderer('window:state', {
      isFullScreen: mainWindow.isFullScreen(),
      isMaximized: mainWindow.isMaximized(),
      isFocused: mainWindow.isFocused(),
    });
  for (const event of ['enter-full-screen', 'leave-full-screen', 'maximize', 'unmaximize', 'focus', 'blur']) {
    mainWindow.on(event, sendWindowState);
  }

  // Sample system stats only while someone can see them.
  mainWindow.on('show', () => stats.start());
  mainWindow.on('restore', () => stats.start());
  mainWindow.on('hide', () => stats.stop());
  mainWindow.on('minimize', () => stats.stop());

  // Open links from the terminal in the default browser, never in the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  mainWindow.on('close', (event) => {
    if (quitConfirmed) return;
    const busy = ptys.busyCount();
    if (busy === 0) return;
    const choice = dialog.showMessageBoxSync(mainWindow, {
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

  mainWindow.on('closed', () => {
    mainWindow = null;
    stats.stop();
  });
}

function menuAction(action) {
  return () => sendToRenderer('menu:action', action);
}

function buildMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: 'Termi',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Open at Login',
                type: 'checkbox',
                checked: app.getLoginItemSettings().openAtLogin,
                click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Shell',
      submenu: [
        { label: 'New Terminal', accelerator: 'CmdOrCtrl+T', click: menuAction('new-terminal') },
        { label: 'New Saved Command…', accelerator: 'CmdOrCtrl+Shift+N', click: menuAction('new-command') },
        { type: 'separator' },
        { label: 'Close Terminal', accelerator: 'CmdOrCtrl+W', click: menuAction('close-terminal') },
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Clear Buffer', accelerator: 'CmdOrCtrl+K', click: menuAction('clear') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: menuAction('toggle-sidebar') },
        { type: 'separator' },
        { label: 'Bigger Text', accelerator: 'CmdOrCtrl+=', click: menuAction('font-bigger') },
        { label: 'Smaller Text', accelerator: 'CmdOrCtrl+-', click: menuAction('font-smaller') },
        { label: 'Default Text Size', accelerator: 'CmdOrCtrl+0', click: menuAction('font-reset') },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }, { role: 'reload' }]),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { label: 'Next Terminal', accelerator: 'CmdOrCtrl+Shift+]', click: menuAction('next-terminal') },
        { label: 'Previous Terminal', accelerator: 'CmdOrCtrl+Shift+[', click: menuAction('prev-terminal') },
        { type: 'separator' },
        ...Array.from({ length: 9 }, (_, i) => ({
          label: `Terminal ${i + 1}`,
          accelerator: `CmdOrCtrl+${i + 1}`,
          click: menuAction(`select-terminal-${i}`),
        })),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpc() {
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    home: app.getPath('home'),
  }));

  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:update', (_event, patch) => updateSettings(patch));

  ipcMain.handle('pty:create', (_event, options) => ptys.create(options));
  ipcMain.on('pty:write', (_event, id, data) => ptys.write(id, data));
  ipcMain.on('pty:resize', (_event, id, cols, rows) => ptys.resize(id, cols, rows));
  ipcMain.on('pty:kill', (_event, id) => ptys.kill(id));

  ipcMain.on('clipboard:write', (_event, text) => {
    if (typeof text === 'string' && text) clipboard.writeText(text);
  });

  ipcMain.handle('dialog:pick-folder', async (_event, defaultPath) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: defaultPath || app.getPath('home'),
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:get-state', () => ({
    isFullScreen: mainWindow?.isFullScreen() ?? false,
    isMaximized: mainWindow?.isMaximized() ?? false,
    isFocused: mainWindow?.isFocused() ?? true,
  }));
}

app.whenReady().then(() => {
  if (isMac) {
    app.dock?.setIcon(nativeImage.createFromPath(APP_ICON));
  }
  app.setAboutPanelOptions({
    applicationName: 'Termi',
    applicationVersion: app.getVersion(),
    copyright: 'A terminal with saved commands and auto-start.',
    iconPath: APP_ICON,
  });

  ptys = new PtyManager(sendToRenderer);
  stats = new SystemStats((sample) => sendToRenderer('stats:update', sample));
  registerIpc();
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });
});

// The terminals belong to the window, so closing it quits the app.
app.on('window-all-closed', () => app.quit());

// Runs after the window closed, so the quit prompt sees the live terminals.
app.on('will-quit', () => {
  ptys?.killAll();
});
