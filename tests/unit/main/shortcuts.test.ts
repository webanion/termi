import type { BrowserWindow } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleShortcuts, runShortcut } from '../../../src/main/shortcuts';
import type { ShortcutInput } from '../../../src/shared/shortcuts';

const PLATFORM = Object.getOwnPropertyDescriptor(process, 'platform');

function setPlatform(value: string): void {
  Object.defineProperty(process, 'platform', { ...PLATFORM, value });
}

afterEach(() => {
  if (PLATFORM) Object.defineProperty(process, 'platform', PLATFORM);
});

type Listener = (event: { preventDefault: () => void }, input: ShortcutInput) => void;

// A window with just what handleShortcuts uses, and a way to press keys in it.
function fakeWindow() {
  let listener: Listener | undefined;
  let fullScreen = false;
  const fake = {
    webContents: {
      on: (name: string, callback: Listener) => {
        if (name === 'before-input-event') listener = callback;
      },
      copy: vi.fn(),
      paste: vi.fn(),
    },
    isFullScreen: () => fullScreen,
    setFullScreen: vi.fn((value: boolean) => {
      fullScreen = value;
    }),
  };
  const press = (key: string, code: string, modifiers: Partial<ShortcutInput> = {}) => {
    const event = { preventDefault: vi.fn() };
    listener?.(event, {
      type: 'keyDown',
      key,
      code,
      control: false,
      shift: false,
      alt: false,
      meta: false,
      ...modifiers,
    });
    return event.preventDefault.mock.calls.length > 0;
  };
  return { win: fake as unknown as BrowserWindow, fake, press, listening: () => Boolean(listener) };
}

describe('handleShortcuts on Linux', () => {
  it('takes Ctrl+Shift+T before the page and tells the page to open a terminal', () => {
    setPlatform('linux');
    const send = vi.fn();
    const { win, press } = fakeWindow();
    handleShortcuts(win, send);
    expect(press('T', 'KeyT', { control: true, shift: true })).toBe(true);
    expect(send).toHaveBeenCalledWith('menu:action', 'new-terminal');
  });

  it('leaves a plain Ctrl+letter to the shell', () => {
    setPlatform('linux');
    const send = vi.fn();
    const { win, press } = fakeWindow();
    handleShortcuts(win, send);
    for (const letter of ['t', 'w', 'k', 'b', 'c', 'v', 'z', 'a', 'q', 'r']) {
      expect(press(letter, `Key${letter.toUpperCase()}`, { control: true }), letter).toBe(false);
    }
    expect(press('T', 'KeyT', { type: 'keyUp', control: true, shift: true })).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('copies, pastes and toggles full screen without the page', () => {
    setPlatform('linux');
    const send = vi.fn();
    const { win, fake, press } = fakeWindow();
    handleShortcuts(win, send);
    expect(press('C', 'KeyC', { control: true, shift: true })).toBe(true);
    expect(fake.webContents.copy).toHaveBeenCalledOnce();
    expect(press('V', 'KeyV', { control: true, shift: true })).toBe(true);
    expect(fake.webContents.paste).toHaveBeenCalledOnce();
    press('F11', 'F11');
    press('F11', 'F11');
    expect(fake.setFullScreen.mock.calls).toEqual([[true], [false]]);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('handleShortcuts on macOS', () => {
  it('leaves every key to the menu', () => {
    setPlatform('darwin');
    const { win, listening } = fakeWindow();
    handleShortcuts(win, vi.fn());
    expect(listening()).toBe(false);
  });
});

describe('runShortcut', () => {
  it('sends the page the actions a menu item runs', () => {
    const send = vi.fn();
    runShortcut('select-terminal-2', send);
    runShortcut('clear', send);
    expect(send.mock.calls).toEqual([
      ['menu:action', 'select-terminal-2'],
      ['menu:action', 'clear'],
    ]);
  });
});
