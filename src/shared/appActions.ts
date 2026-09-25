// Every action Termi offers, with the name the menu, the command palette and the shortcut sheet
// show for it. The keys of those that have one are in shortcuts.ts.

import type { ShortcutAction } from './shortcuts';

export type HelpAction = 'show-guide' | 'report-issue' | 'release-notes';
export type AppAction = ShortcutAction | HelpAction;

const LABELS: Record<AppAction, string> = {
  'new-terminal': 'New Terminal',
  'new-command': 'New Saved Command…',
  'close-terminal': 'Close Terminal',
  clear: 'Clear Buffer',
  'toggle-sidebar': 'Toggle Sidebar',
  'font-bigger': 'Bigger Text',
  'font-smaller': 'Smaller Text',
  'font-reset': 'Default Text Size',
  'next-terminal': 'Next Terminal',
  'prev-terminal': 'Previous Terminal',
  'next-pane': 'Next Pane',
  'prev-pane': 'Previous Pane',
  'select-terminal-0': 'Terminal 1',
  'select-terminal-1': 'Terminal 2',
  'select-terminal-2': 'Terminal 3',
  'select-terminal-3': 'Terminal 4',
  'select-terminal-4': 'Terminal 5',
  'select-terminal-5': 'Terminal 6',
  'select-terminal-6': 'Terminal 7',
  'select-terminal-7': 'Terminal 8',
  'select-terminal-8': 'Terminal 9',
  copy: 'Copy',
  paste: 'Paste',
  'toggle-fullscreen': 'Toggle Full Screen',
  'show-shortcuts': 'Keyboard Shortcuts',
  'command-palette': 'Command Palette…',
  'show-guide': 'Termi Guide',
  'report-issue': 'Report an Issue…',
  'release-notes': 'Release Notes',
};

export function actionLabel(action: AppAction): string {
  return LABELS[action];
}

// The actions the command palette lists: those the page runs itself. Copy, paste and full screen
// act on the window and its selection, the terminals are listed by name instead of by number,
// and the palette does not list itself.
export const PALETTE_ACTIONS: AppAction[] = [
  'new-terminal',
  'new-command',
  'close-terminal',
  'clear',
  'toggle-sidebar',
  'font-bigger',
  'font-smaller',
  'font-reset',
  'next-terminal',
  'prev-terminal',
  'next-pane',
  'prev-pane',
  'show-guide',
  'show-shortcuts',
  'report-issue',
  'release-notes',
];

export const REPO_URL = 'https://github.com/webanion/termi';
