import { actionLabel } from '../shared/appActions';
import { SHORTCUT_ACTIONS, shortcutLabel } from '../shared/shortcuts';
import { keysFor } from './HelpKeys';

// Every shortcut on this platform, read from the table the menu is built from, so the two agree.
export function shortcutRows(platform: string): { label: string; keys: string }[] {
  const rows = SHORTCUT_ACTIONS.filter(
    (action) => !action.startsWith('select-terminal-') || action === 'select-terminal-0',
  ).map((action) =>
    action === 'select-terminal-0'
      ? {
          label: 'Terminal 1 to 9',
          keys: `${shortcutLabel('select-terminal-0', platform)} to ${shortcutLabel('select-terminal-8', platform)}`,
        }
      : { label: actionLabel(action).replace(/…$/, ''), keys: shortcutLabel(action, platform) },
  );
  return [...rows, { label: 'Open a link', keys: keysFor('link-click', platform) ?? '' }];
}
