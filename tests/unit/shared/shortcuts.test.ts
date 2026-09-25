import { describe, expect, it } from 'vitest';
import {
  isShortcutAction,
  matchShortcut,
  SHORTCUT_ACTIONS,
  SHORTCUTS,
  shortcutAccelerator,
  shortcutLabel,
  type ShortcutInput,
} from '../../../src/shared/shortcuts';

// The accelerators the macOS menu had before the table, as written in menu.ts, and the defaults
// of the roles that covered copy, paste and full screen.
const MAC_BEFORE: Record<string, string> = {
  'new-terminal': 'CmdOrCtrl+T',
  'new-command': 'CmdOrCtrl+Shift+N',
  'close-terminal': 'CmdOrCtrl+W',
  clear: 'CmdOrCtrl+K',
  'toggle-sidebar': 'CmdOrCtrl+B',
  'font-bigger': 'CmdOrCtrl+=',
  'font-smaller': 'CmdOrCtrl+-',
  'font-reset': 'CmdOrCtrl+0',
  'next-terminal': 'CmdOrCtrl+Shift+]',
  'prev-terminal': 'CmdOrCtrl+Shift+[',
  'next-pane': 'Cmd+]',
  'prev-pane': 'Cmd+[',
  ...Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [`select-terminal-${i}`, `CmdOrCtrl+${i + 1}`]),
  ),
  copy: 'CommandOrControl+C',
  paste: 'CommandOrControl+V',
  'toggle-fullscreen': 'Control+Command+F',
};

// Shortcuts added after the table, with the keys macOS gives them.
const MAC_ADDED: Record<string, string> = {
  'show-shortcuts': 'Cmd+/',
  'command-palette': 'Cmd+Shift+P',
};

const ALIASES: Record<string, string> = {
  CmdOrCtrl: 'Cmd',
  CommandOrControl: 'Cmd',
  Command: 'Cmd',
  Control: 'Ctrl',
};

// One spelling for a key combination, whatever the order of its modifiers, with the aliases
// read as they are on macOS.
function combo(accelerator: string): string {
  const parts = accelerator.split('+').map((p) => ALIASES[p] ?? p);
  const key = parts.pop();
  return [...parts.sort(), key].join('+');
}

const press = (
  key: string,
  code: string,
  modifiers: Partial<Omit<ShortcutInput, 'key' | 'code'>> = {},
): ShortcutInput => ({
  type: 'keyDown',
  key,
  code,
  control: false,
  shift: false,
  alt: false,
  meta: false,
  ...modifiers,
});

describe('the shortcut table', () => {
  it('gives every action a key on macOS and on other systems', () => {
    for (const action of SHORTCUT_ACTIONS) {
      expect(SHORTCUTS[action].mac, action).toMatch(/\S/);
      expect(SHORTCUTS[action].other, action).toMatch(/\S/);
    }
  });

  it('never gives two actions the same keys on one system', () => {
    for (const system of ['mac', 'other'] as const) {
      const combos = SHORTCUT_ACTIONS.map((a) => combo(SHORTCUTS[a][system]));
      expect(new Set(combos).size, system).toBe(combos.length);
    }
  });

  it('leaves every plain Ctrl+letter to the shell on other systems', () => {
    for (const action of SHORTCUT_ACTIONS) {
      const parts = SHORTCUTS[action].other.split('+');
      const key = parts.pop() ?? '';
      if (/^[A-Z]$/.test(key) && parts.includes('Ctrl')) {
        expect(parts.includes('Shift') || parts.includes('Alt'), action).toBe(true);
      }
    }
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const input = press(letter.toLowerCase(), `Key${letter}`, { control: true });
      expect(matchShortcut(input, false), letter).toBeNull();
    }
  });

  it('keeps the macOS keys the menu had before', () => {
    const expected = { ...MAC_BEFORE, ...MAC_ADDED };
    expect(Object.keys(expected).sort()).toEqual([...SHORTCUT_ACTIONS].sort());
    for (const action of SHORTCUT_ACTIONS) {
      expect(combo(SHORTCUTS[action].mac), action).toBe(combo(expected[action] ?? ''));
    }
  });

  it('picks the keys for the platform', () => {
    expect(shortcutAccelerator('new-terminal', 'darwin')).toBe('Cmd+T');
    expect(shortcutAccelerator('new-terminal', 'linux')).toBe('Ctrl+Shift+T');
    expect(shortcutAccelerator('select-terminal-0', 'linux')).toBe('Alt+1');
  });

  it('knows its action names', () => {
    expect(isShortcutAction('select-terminal-8')).toBe(true);
    expect(isShortcutAction('select-terminal-9')).toBe(false);
    expect(isShortcutAction('toString')).toBe(false);
  });
});

describe('shortcutLabel', () => {
  it('writes macOS keys as symbols in Apple order', () => {
    expect(shortcutLabel('new-command', 'darwin')).toBe('⇧⌘N');
    expect(shortcutLabel('new-terminal', 'darwin')).toBe('⌘T');
    expect(shortcutLabel('select-terminal-0', 'darwin')).toBe('⌘1');
    expect(shortcutLabel('toggle-fullscreen', 'darwin')).toBe('⌃⌘F');
  });

  it('writes the keys out on other systems', () => {
    expect(shortcutLabel('new-terminal', 'linux')).toBe('Ctrl+Shift+T');
    expect(shortcutLabel('toggle-sidebar', 'linux')).toBe('Ctrl+Shift+B');
    expect(shortcutLabel('select-terminal-0', 'linux')).toBe('Alt+1');
    expect(shortcutLabel('next-terminal', 'linux')).toBe('Ctrl+Page Down');
    expect(shortcutLabel('prev-terminal', 'linux')).toBe('Ctrl+Page Up');
    expect(shortcutLabel('show-shortcuts', 'linux')).toBe('Ctrl+Shift+/');
    expect(shortcutLabel('show-shortcuts', 'darwin')).toBe('⌘/');
    expect(shortcutLabel('command-palette', 'darwin')).toBe('⇧⌘P');
  });
});

describe('matchShortcut', () => {
  it('matches Ctrl+Shift+/ by its key, whatever it types with Shift', () => {
    const input = press('?', 'Slash', { control: true, shift: true });
    expect(matchShortcut(input, false)).toBe('show-shortcuts');
    expect(matchShortcut(press('P', 'KeyP', { control: true, shift: true }), false)).toBe(
      'command-palette',
    );
  });

  it('matches Ctrl+Shift+T by the letter it types', () => {
    expect(matchShortcut(press('T', 'KeyT', { control: true, shift: true }), false)).toBe(
      'new-terminal',
    );
    // A layout that types T on another key.
    expect(matchShortcut(press('T', 'KeyK', { control: true, shift: true }), false)).toBe(
      'new-terminal',
    );
  });

  it('leaves Ctrl+T alone, since every modifier must match', () => {
    expect(matchShortcut(press('t', 'KeyT', { control: true }), false)).toBeNull();
    expect(
      matchShortcut(press('T', 'KeyT', { control: true, shift: true, alt: true }), false),
    ).toBeNull();
  });

  it('matches Alt+1 by the key position', () => {
    expect(matchShortcut(press('1', 'Digit1', { alt: true }), false)).toBe('select-terminal-0');
    // A layout that needs Shift for digits types & there.
    expect(matchShortcut(press('&', 'Digit1', { alt: true }), false)).toBe('select-terminal-0');
  });

  it('matches Ctrl+PageDown and Ctrl+Alt+]', () => {
    expect(matchShortcut(press('PageDown', 'PageDown', { control: true }), false)).toBe(
      'next-terminal',
    );
    expect(matchShortcut(press(']', 'BracketRight', { control: true, alt: true }), false)).toBe(
      'next-pane',
    );
  });

  it('matches F11 and the copy and paste keys', () => {
    expect(matchShortcut(press('F11', 'F11'), false)).toBe('toggle-fullscreen');
    expect(matchShortcut(press('C', 'KeyC', { control: true, shift: true }), false)).toBe('copy');
    expect(matchShortcut(press('V', 'KeyV', { control: true, shift: true }), false)).toBe('paste');
  });

  it('ignores a key being released', () => {
    const input = { ...press('T', 'KeyT', { control: true, shift: true }), type: 'keyUp' };
    expect(matchShortcut(input, false)).toBeNull();
  });

  it('falls back to the key position when the layout types no Latin letter', () => {
    expect(matchShortcut(press('Е', 'KeyT', { control: true, shift: true }), false)).toBe(
      'new-terminal',
    );
    expect(matchShortcut(press('Е', 'KeyT', { control: true }), false)).toBeNull();
  });

  it('matches the macOS keys when asked for them', () => {
    expect(matchShortcut(press('t', 'KeyT', { meta: true }), true)).toBe('new-terminal');
    expect(matchShortcut(press('f', 'KeyF', { meta: true, control: true }), true)).toBe(
      'toggle-fullscreen',
    );
    expect(matchShortcut(press('t', 'KeyT', { meta: true }), false)).toBeNull();
  });
});
