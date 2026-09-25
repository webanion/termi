import { isShortcutAction, shortcutLabel } from '../shared/shortcuts';

// The keys for a shortcut on this platform, or for a link click, which is not in the table.
export function keysFor(name: string, platform: string): string | null {
  if (name === 'link-click') return platform === 'darwin' ? '⌘ click' : 'Ctrl+click';
  return isShortcutAction(name) ? shortcutLabel(name, platform) : null;
}

export function HelpKeys({ name, platform }: { name: string; platform: string }) {
  const keys = keysFor(name, platform);
  return keys ? <kbd className="keys">{keys}</kbd> : <>{`{${name}}`}</>;
}
