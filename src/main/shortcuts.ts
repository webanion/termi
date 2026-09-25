import type { BrowserWindow } from 'electron';
import type { SendEvent } from '../shared/ipc';
import { matchShortcut, type ShortcutAction } from '../shared/shortcuts';

// What a shortcut does, from its key or its menu item. Copy, paste and full screen act on the
// window. The page runs every other action.
export function runShortcut(action: ShortcutAction, send: SendEvent, win?: BrowserWindow): void {
  if (action === 'copy') win?.webContents.copy();
  else if (action === 'paste') win?.webContents.paste();
  else if (action === 'toggle-fullscreen') win?.setFullScreen(!win.isFullScreen());
  else send('menu:action', action);
}

// The macOS menu takes ⌘ keys before the page. Other systems give the page every key first, and
// xterm keeps Ctrl+letters, so a menu shortcut never fires while a terminal has focus. There the
// table's keys are taken here, before the page sees them, and every other key reaches the shell.
export function handleShortcuts(win: BrowserWindow, send: SendEvent): void {
  if (process.platform === 'darwin') return;
  win.webContents.on('before-input-event', (event, input) => {
    const action = matchShortcut(input, false);
    if (!action) return;
    event.preventDefault();
    runShortcut(action, send, win);
  });
}
