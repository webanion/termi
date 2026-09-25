// What the command palette lists: every action the page runs, with its keys, and every running
// terminal by name.

import { actionLabel, PALETTE_ACTIONS, type AppAction } from '../shared/appActions';
import { isShortcutAction, shortcutLabel } from '../shared/shortcuts';

export interface PaletteItem {
  key: string;
  label: string;
  keys: string;
  run: { action: AppAction } | { tabId: number };
}

export function paletteItems(
  platform: string,
  tabs: { id: number; name: string }[],
): PaletteItem[] {
  const actions = PALETTE_ACTIONS.map((action) => ({
    key: action,
    label: actionLabel(action).replace(/…$/, ''),
    keys: isShortcutAction(action) ? shortcutLabel(action, platform) : '',
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

// The items whose label holds every word of the query, in their order.
export function filterPalette(items: PaletteItem[], query: string): PaletteItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => words.every((word) => item.label.toLowerCase().includes(word)));
}
