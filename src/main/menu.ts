import { app, Menu, type MenuItemConstructorOptions } from 'electron';
import type { SendEvent } from '../shared/ipc';

const isMac = process.platform === 'darwin';

// The menu's own items only tell the renderer what to do.
export function buildMenu(send: SendEvent): void {
  const action = (name: string) => () => send('menu:action', name);

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
        { label: 'New Terminal', accelerator: 'CmdOrCtrl+T', click: action('new-terminal') },
        {
          label: 'New Saved Command…',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: action('new-command'),
        },
        { type: 'separator' },
        { label: 'Close Terminal', accelerator: 'CmdOrCtrl+W', click: action('close-terminal') },
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
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Clear Buffer', accelerator: 'CmdOrCtrl+K', click: action('clear') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: action('toggle-sidebar') },
        { type: 'separator' },
        { label: 'Bigger Text', accelerator: 'CmdOrCtrl+=', click: action('font-bigger') },
        { label: 'Smaller Text', accelerator: 'CmdOrCtrl+-', click: action('font-smaller') },
        { label: 'Default Text Size', accelerator: 'CmdOrCtrl+0', click: action('font-reset') },
        { type: 'separator' },
        { role: 'togglefullscreen' },
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
        {
          label: 'Next Terminal',
          accelerator: 'CmdOrCtrl+Shift+]',
          click: action('next-terminal'),
        },
        {
          label: 'Previous Terminal',
          accelerator: 'CmdOrCtrl+Shift+[',
          click: action('prev-terminal'),
        },
        // Ctrl+[ is Escape in a terminal, so other systems add Alt.
        {
          label: 'Next Pane',
          accelerator: isMac ? 'Cmd+]' : 'Ctrl+Alt+]',
          click: action('next-pane'),
        },
        {
          label: 'Previous Pane',
          accelerator: isMac ? 'Cmd+[' : 'Ctrl+Alt+[',
          click: action('prev-pane'),
        },
        { type: 'separator' },
        ...Array.from({ length: 9 }, (_, i) => ({
          label: `Terminal ${i + 1}`,
          accelerator: `CmdOrCtrl+${i + 1}`,
          click: action(`select-terminal-${i}`),
        })),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
