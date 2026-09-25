// Every keyboard shortcut, as an Electron accelerator for macOS and one for other systems. The
// menu shows them, the page labels its buttons with them, and on other systems the main process
// matches keys against them. There, no shortcut is a plain Ctrl+letter, because those belong to
// the shell: Ctrl+W deletes a word, Ctrl+K kills the line, Ctrl+B is the tmux prefix.

export interface ShortcutKeys {
  mac: string;
  other: string;
}

export const SHORTCUTS = {
  'new-terminal': { mac: 'Cmd+T', other: 'Ctrl+Shift+T' },
  'new-command': { mac: 'Cmd+Shift+N', other: 'Ctrl+Shift+N' },
  'close-terminal': { mac: 'Cmd+W', other: 'Ctrl+Shift+W' },
  clear: { mac: 'Cmd+K', other: 'Ctrl+Shift+K' },
  'toggle-sidebar': { mac: 'Cmd+B', other: 'Ctrl+Shift+B' },
  'font-bigger': { mac: 'Cmd+=', other: 'Ctrl+=' },
  'font-smaller': { mac: 'Cmd+-', other: 'Ctrl+-' },
  'font-reset': { mac: 'Cmd+0', other: 'Ctrl+0' },
  'next-terminal': { mac: 'Cmd+Shift+]', other: 'Ctrl+PageDown' },
  'prev-terminal': { mac: 'Cmd+Shift+[', other: 'Ctrl+PageUp' },
  // Ctrl+[ is Escape in a terminal, so other systems add Alt.
  'next-pane': { mac: 'Cmd+]', other: 'Ctrl+Alt+]' },
  'prev-pane': { mac: 'Cmd+[', other: 'Ctrl+Alt+[' },
  'select-terminal-0': { mac: 'Cmd+1', other: 'Alt+1' },
  'select-terminal-1': { mac: 'Cmd+2', other: 'Alt+2' },
  'select-terminal-2': { mac: 'Cmd+3', other: 'Alt+3' },
  'select-terminal-3': { mac: 'Cmd+4', other: 'Alt+4' },
  'select-terminal-4': { mac: 'Cmd+5', other: 'Alt+5' },
  'select-terminal-5': { mac: 'Cmd+6', other: 'Alt+6' },
  'select-terminal-6': { mac: 'Cmd+7', other: 'Alt+7' },
  'select-terminal-7': { mac: 'Cmd+8', other: 'Alt+8' },
  'select-terminal-8': { mac: 'Cmd+9', other: 'Alt+9' },
  copy: { mac: 'Cmd+C', other: 'Ctrl+Shift+C' },
  paste: { mac: 'Cmd+V', other: 'Ctrl+Shift+V' },
  'toggle-fullscreen': { mac: 'Ctrl+Cmd+F', other: 'F11' },
} satisfies Record<string, ShortcutKeys>;

export type ShortcutAction = keyof typeof SHORTCUTS;

export const SHORTCUT_ACTIONS = Object.keys(SHORTCUTS) as ShortcutAction[];

export function isShortcutAction(name: string): name is ShortcutAction {
  return Object.hasOwn(SHORTCUTS, name);
}

// `platform` is a Node platform name, as in process.platform or AppInfo.
export function shortcutAccelerator(action: ShortcutAction, platform: string): string {
  const keys = SHORTCUTS[action];
  return platform === 'darwin' ? keys.mac : keys.other;
}

interface Combo {
  control: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

function parse(accelerator: string): Combo {
  const parts = accelerator.split('+');
  const key = parts.pop() ?? '';
  return {
    control: parts.includes('Ctrl'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
    meta: parts.includes('Cmd'),
    key,
  };
}

const KEY_NAMES: Record<string, string> = { PageUp: 'Page Up', PageDown: 'Page Down' };
const keyName = (key: string) => KEY_NAMES[key] ?? key;

// macOS writes symbols in Apple's order, as in ⇧⌘N. Other systems write the accelerator out,
// as in Ctrl+Shift+T.
export function shortcutLabel(action: ShortcutAction, platform: string): string {
  const accelerator = shortcutAccelerator(action, platform);
  if (platform !== 'darwin') return accelerator.split('+').map(keyName).join('+');
  const { control, alt, shift, meta, key } = parse(accelerator);
  const symbols = `${control ? '⌃' : ''}${alt ? '⌥' : ''}${shift ? '⇧' : ''}${meta ? '⌘' : ''}`;
  return symbols + keyName(key);
}

// The fields of Electron's Input, the key event main sees before the page.
export interface ShortcutInput {
  type?: string;
  key: string;
  code: string;
  control: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

const CODES: Record<string, string> = {
  '=': 'Equal',
  '-': 'Minus',
  '[': 'BracketLeft',
  ']': 'BracketRight',
};

// A letter matches by the character it types, so the shortcut follows the keyboard layout, or by
// its position when the layout types no Latin letter there. Anything else matches by position.
function keyMatches(key: string, input: ShortcutInput): boolean {
  if (/^[A-Z]$/.test(key)) {
    return /^[a-z]$/i.test(input.key)
      ? input.key.toUpperCase() === key
      : input.code === `Key${key}`;
  }
  if (/^[0-9]$/.test(key)) return input.code === `Digit${key}`;
  return input.code === (CODES[key] ?? key);
}

const combos = (system: keyof ShortcutKeys) =>
  SHORTCUT_ACTIONS.map((action) => ({ action, combo: parse(SHORTCUTS[action][system]) }));
const MAC_COMBOS = combos('mac');
const OTHER_COMBOS = combos('other');

// The action a key press runs, or null. Every modifier must match, so Ctrl+T is not Ctrl+Shift+T.
export function matchShortcut(input: ShortcutInput, mac: boolean): ShortcutAction | null {
  if (input.type !== undefined && input.type !== 'keyDown') return null;
  const found = (mac ? MAC_COMBOS : OTHER_COMBOS).find(
    ({ combo }) =>
      combo.control === input.control &&
      combo.shift === input.shift &&
      combo.alt === input.alt &&
      combo.meta === input.meta &&
      keyMatches(combo.key, input),
  );
  return found ? found.action : null;
}
