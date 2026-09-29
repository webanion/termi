import { clipboard, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import { actionLabel } from '@/shared/appActions';
import type { SendEvent } from '@/shared/ipc';
import { isRecord } from '@/shared/savedCommands';
import { shortcutAccelerator, type ShortcutAction } from '@/shared/shortcuts';
import type { TerminalContext } from '@/shared/types';
import { isWebLink, openLink } from './links';
import { runShortcut } from './shortcuts';

const MAX_LINK = 2048;

// The page's report of a right-click in a terminal, checked, or null. A link that is not a web
// link is dropped, so the menu never offers it.
export function readTerminalContext(value: unknown): TerminalContext | null {
  if (!isRecord(value) || typeof value.hasSelection !== 'boolean') return null;
  const { link } = value;
  if (link !== null && typeof link !== 'string') return null;
  const web = typeof link === 'string' && link.length <= MAX_LINK && isWebLink(link);
  return { hasSelection: value.hasSelection, link: web ? link : null };
}

// The items show the table's keys, which the app menu and handleShortcuts already take.
const keys = (name: ShortcutAction) => ({
  accelerator: shortcutAccelerator(name, process.platform),
  registerAccelerator: false,
});

// Copy and paste act on the window, as their keys do, so a paste reaches xterm the same way,
// bracketed paste included. The page runs the rest on its focused pane, which the right-click
// focused.
export function terminalMenuTemplate(
  context: TerminalContext,
  win: BrowserWindow,
  send: SendEvent,
): MenuItemConstructorOptions[] {
  const { link } = context;
  const linkItems: MenuItemConstructorOptions[] = link
    ? [
        { label: 'Open Link', click: () => openLink(link) },
        { label: 'Copy Link Address', click: () => clipboard.writeText(link) },
        { type: 'separator' },
      ]
    : [];
  return [
    ...linkItems,
    {
      label: actionLabel('copy'),
      ...keys('copy'),
      enabled: context.hasSelection,
      click: () => runShortcut('copy', send, win),
    },
    { label: actionLabel('paste'), ...keys('paste'), click: () => runShortcut('paste', send, win) },
    { type: 'separator' },
    { label: 'Select All', click: () => send('menu:action', 'select-all') },
    { label: actionLabel('clear'), ...keys('clear'), click: () => runShortcut('clear', send) },
  ];
}

export function showTerminalMenu(win: BrowserWindow, context: TerminalContext, send: SendEvent) {
  Menu.buildFromTemplate(terminalMenuTemplate(context, win, send)).popup({ window: win });
}

// Text fields get the standard edit menu, and the rest of the page none. A right-click in a
// terminal never gets here, because the page cancels it and asks for the terminal's menu.
export function handleContextMenus(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_event, params) => {
    if (!params.isEditable) return;
    const flags = params.editFlags;
    Menu.buildFromTemplate([
      { role: 'cut', enabled: flags.canCut },
      { role: 'copy', enabled: flags.canCopy },
      { role: 'paste', enabled: flags.canPaste },
      { type: 'separator' },
      { role: 'selectAll', enabled: flags.canSelectAll },
    ]).popup({ window: win });
  });
}
