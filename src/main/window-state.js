const path = require('path');
const { app, screen } = require('electron');
const { readJson, writeJson } = require('./json-file');

const DEFAULTS = { width: 1100, height: 700 };
const MIN_VISIBLE = 80; // px of the window that must stay on a screen

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

// True when enough of the window is on a connected display to grab it.
function isVisible(bounds) {
  return screen.getAllDisplays().some(({ workArea: a }) => {
    const overlapX = Math.min(bounds.x + bounds.width, a.x + a.width) - Math.max(bounds.x, a.x);
    const overlapY = Math.min(bounds.y + bounds.height, a.y + a.height) - Math.max(bounds.y, a.y);
    return overlapX >= MIN_VISIBLE && overlapY >= MIN_VISIBLE;
  });
}

// Load the last saved window bounds. A window from a display that is no
// longer connected keeps its size but is centered on the main display.
function loadWindowState() {
  const saved = readJson(stateFile(), null);
  if (!saved || typeof saved.width !== 'number') return { ...DEFAULTS };

  const state = {
    width: Math.max(saved.width, 480),
    height: Math.max(saved.height, 320),
    isMaximized: Boolean(saved.isMaximized),
    isFullScreen: Boolean(saved.isFullScreen),
  };
  if (typeof saved.x === 'number' && typeof saved.y === 'number') {
    const bounds = { x: saved.x, y: saved.y, width: state.width, height: state.height };
    if (isVisible(bounds)) Object.assign(state, { x: saved.x, y: saved.y });
  }
  return state;
}

// Save the window bounds whenever the window moves or resizes, and on close.
function trackWindowState(win) {
  let timer = null;

  const save = () => {
    clearTimeout(timer);
    if (win.isDestroyed()) return;
    const isMaximized = win.isMaximized();
    const isFullScreen = win.isFullScreen();
    // Keep the normal bounds, so un-maximizing after a restart goes back to them.
    const bounds = isMaximized || isFullScreen ? win.getNormalBounds() : win.getBounds();
    writeJson(stateFile(), { ...bounds, isMaximized, isFullScreen });
  };
  const saveSoon = () => {
    clearTimeout(timer);
    timer = setTimeout(save, 400);
  };

  for (const event of ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) {
    win.on(event, saveSoon);
  }
  win.on('close', save);
}

module.exports = { loadWindowState, trackWindowState };
