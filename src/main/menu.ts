import { app, Menu, type MenuItemConstructorOptions } from 'electron';
import type { SendEvent } from '../shared/ipc';
import { SHORTCUT_ACTIONS, shortcutAccelerator, type ShortcutAction } from '../shared/shortcuts';
import { runShortcut } from './shortcuts';

const isMac = process.platform === 'darwin';

const keys = (name: ShortcutAction) => shortcutAccelerator(name, process.platform);

// Other systems give the page every key before the menu, and xterm keeps Ctrl+letters, so a key
// the menu registered would go to the menu or to the shell depending on focus. There no item
// registers its key, a role's included, which leaves Ctrl+Z, Ctrl+A and Ctrl+Q to the shell.
// The items still show their keys, and handleShortcuts takes the table's. Only the development
// build's developer tools keep theirs.
function unregistered(items: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] {
  return items.map((item) => {
    const kept = { ...item, registerAccelerator: item.role === 'toggleDevTools' };
    if (Array.isArray(item.submenu)) kept.submenu = unregistered(item.submenu);
    return kept;
  });
}

// The menu's own items only tell the renderer what to do.
export function buildMenu(send: SendEvent): void {
  const item = (label: string, name: ShortcutAction): MenuItemConstructorOptions => ({
    label,
    accelerator: keys(name),
    click: () => runShortcut(name, send),
  });
  // macOS keeps these roles' own keys, which the table repeats. Other systems show the table's.
  const roleItem = (
    role: 'copy' | 'paste' | 'togglefullscreen',
    name: ShortcutAction,
  ): MenuItemConstructorOptions => (isMac ? { role } : { role, accelerator: keys(name) });

  const template: MenuItemConstructorOptions[] = [
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
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: 'Shell',
      submenu: [
        item('New Terminal', 'new-terminal'),
        item('New Saved Command…', 'new-command'),
        { type: 'separator' },
        item('Close Terminal', 'close-terminal'),
        ...(isMac
          ? []
          : [
              { type: 'separator' } as const,
              { role: 'quit' } satisfies MenuItemConstructorOptions,
            ]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        roleItem('copy', 'copy'),
        roleItem('paste', 'paste'),
        { role: 'selectAll' },
        { type: 'separator' },
        item('Clear Buffer', 'clear'),
      ],
    },
    {
      label: 'View',
      submenu: [
        item('Toggle Sidebar', 'toggle-sidebar'),
        { type: 'separator' },
        item('Bigger Text', 'font-bigger'),
        item('Smaller Text', 'font-smaller'),
        item('Default Text Size', 'font-reset'),
        { type: 'separator' },
        roleItem('togglefullscreen', 'toggle-fullscreen'),
        ...(app.isPackaged
          ? []
          : [
              { role: 'toggleDevTools' } satisfies MenuItemConstructorOptions,
              { role: 'reload' } satisfies MenuItemConstructorOptions,
            ]),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        item('Next Terminal', 'next-terminal'),
        item('Previous Terminal', 'prev-terminal'),
        item('Next Pane', 'next-pane'),
        item('Previous Pane', 'prev-pane'),
        { type: 'separator' },
        ...SHORTCUT_ACTIONS.filter((name) => name.startsWith('select-terminal-')).map((name, i) =>
          item(`Terminal ${i + 1}`, name),
        ),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(isMac ? template : unregistered(template)));
}
