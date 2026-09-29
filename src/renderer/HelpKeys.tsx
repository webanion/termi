import { isShortcutAction, shortcutLabel } from '@/shared/shortcuts';

// The keys for a shortcut on this platform, or for a mouse click, which is not in the table: a
// link click, and the right-click that opens the menu over a program that takes the mouse.
export function keysFor(name: string, platform: string): string | null {
  if (name === 'link-click') return platform === 'darwin' ? '⌘ click' : 'Ctrl+click';
  if (name === 'menu-click') return platform === 'darwin' ? '⌥ right-click' : 'Shift+right-click';
  return isShortcutAction(name) ? shortcutLabel(name, platform) : null;
}

export function HelpKeys({ name, platform }: { name: string; platform: string }) {
  const keys = keysFor(name, platform);
  return keys ? <kbd className="keys">{keys}</kbd> : <>{`{${name}}`}</>;
}
