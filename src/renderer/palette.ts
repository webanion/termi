// What the palette's two panels list. The command palette lists every action the page runs, with
// its keys, and every running terminal by name. `hidden` holds the actions that have nothing to
// act on at the moment, and `checked` whether each action that is on or off is on. The launcher lists the saved commands.

import { actionLabel, PALETTE_ACTIONS, type AppAction } from '@/shared/appActions';
import { isShortcutAction, shortcutLabel } from '@/shared/shortcuts';
import type { SavedCommand } from '@/shared/types';
import { commandLabel } from './commandText';

export interface PaletteItem {
  key: string;
  label: string;
  detail?: string; // shown dim after the label
  keys: string;
  checked?: boolean; // an action that is on or off, such as word wrap, shows a check mark when on
  run: { action: AppAction } | { tabId: number } | { commandId: string };
}

export function paletteItems(
  platform: string,
  tabs: { id: number; name: string }[],
  hidden: readonly AppAction[] = [],
  checked: Partial<Record<AppAction, boolean>> = {},
): PaletteItem[] {
  const shown = PALETTE_ACTIONS.filter((action) => !hidden.includes(action));
  const actions = shown.map((action) => ({
    key: action,
    label: actionLabel(action).replace(/…$/, ''),
    keys: isShortcutAction(action) ? shortcutLabel(action, platform) : '',
    ...(action in checked ? { checked: checked[action] } : {}),
    run: { action },
  }));
  const terminals = tabs.map((tab, i) => {
    const select = `select-terminal-${i}`;
    return {
      key: `tab-${tab.id}`,
      label: `Go to ${tab.name}`,
      keys: isShortcutAction(select) ? shortcutLabel(select, platform) : '',
      run: { tabId: tab.id },
    };
  });
  return [...actions, ...terminals];
}

// Each saved command by name, with what its first terminal runs, or its folder when that is a
// plain shell.
export function launcherItems(commands: SavedCommand[]): PaletteItem[] {
  return commands.map((cmd) => ({
    key: `command-${cmd.id}`,
    label: cmd.name,
    detail: commandLabel(cmd.terminals[0]?.command ?? '') || cmd.cwd || 'Plain shell',
    keys: '',
    run: { commandId: cmd.id },
  }));
}

// The launcher's one row when there is no saved command yet.
export function newCommandItem(platform: string): PaletteItem {
  return {
    key: 'new-command',
    label: actionLabel('new-command').replace(/…$/, ''),
    keys: shortcutLabel('new-command', platform),
    run: { action: 'new-command' },
  };
}

// The items whose label holds every word of the query, in their order.
export function filterPalette(items: PaletteItem[], query: string): PaletteItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => words.every((word) => item.label.toLowerCase().includes(word)));
}
