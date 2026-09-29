import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  built: [] as MenuItemConstructorOptions[][],
  popup: (() => {}) as (options: unknown) => void,
  openExternal: (() => {}) as (url: string) => void,
  writeText: (() => {}) as (text: string) => void,
}));

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => {
      mocks.built.push(template);
      return { popup: mocks.popup };
    },
  },
  clipboard: { writeText: (text: string) => mocks.writeText(text) },
  shell: { openExternal: (url: string) => mocks.openExternal(url) },
}));

const { handleContextMenus, readTerminalContext, terminalMenuTemplate } =
  await import('../../../src/main/contextMenu');
const { openLink } = await import('../../../src/main/links');

const PLATFORM = Object.getOwnPropertyDescriptor(process, 'platform');

function setPlatform(value: string): void {
  Object.defineProperty(process, 'platform', { ...PLATFORM, value });
}

type ContextMenuListener = (
  event: unknown,
  params: { isEditable: boolean; editFlags: Record<string, boolean> },
) => void;

// A window with just what the menus use.
function fakeWindow() {
  let listener: ContextMenuListener | undefined;
  const win = {
    webContents: {
      copy: vi.fn(),
      paste: vi.fn(),
      on: (name: string, callback: ContextMenuListener) => {
        if (name === 'context-menu') listener = callback;
      },
    },
  };
  const rightClick: ContextMenuListener = (event, params) => listener?.(event, params);
  return { win: win as unknown as BrowserWindow, contents: win.webContents, rightClick };
}

const click = (item: MenuItemConstructorOptions | undefined) =>
  (item?.click as (() => void) | undefined)?.();

const byLabel = (items: MenuItemConstructorOptions[], label: string) =>
  items.find((item) => item.label === label);

beforeEach(() => {
  mocks.built = [];
  mocks.popup = vi.fn();
  mocks.openExternal = vi.fn();
  mocks.writeText = vi.fn();
});

afterEach(() => {
  if (PLATFORM) Object.defineProperty(process, 'platform', PLATFORM);
});

describe('readTerminalContext', () => {
  it('keeps a selection flag and a web link', () => {
    expect(readTerminalContext({ hasSelection: true, link: 'https://example.com/a' })).toEqual({
      hasSelection: true,
      link: 'https://example.com/a',
    });
    expect(readTerminalContext({ hasSelection: false, link: null })).toEqual({
      hasSelection: false,
      link: null,
    });
  });

  it('drops a link that is not http or https, or is too long', () => {
    for (const link of [
      'file:///etc/passwd',
      'javascript:alert(1)',
      'ftp://example.com',
      `https://example.com/${'a'.repeat(2048)}`,
    ]) {
      expect(readTerminalContext({ hasSelection: true, link })).toEqual({
        hasSelection: true,
        link: null,
      });
    }
  });

  it('refuses anything else', () => {
    for (const value of [
      null,
      'menu',
      {},
      { hasSelection: 'yes', link: null },
      { hasSelection: true },
      { hasSelection: true, link: 42 },
    ]) {
      expect(readTerminalContext(value)).toBeNull();
    }
  });
});

describe('terminalMenuTemplate', () => {
  it('offers Copy only with a selection, and shows the keys for the platform', () => {
    const { win } = fakeWindow();
    setPlatform('linux');
    const items = terminalMenuTemplate({ hasSelection: false, link: null }, win, vi.fn());
    expect(items.map((item) => item.label ?? item.type)).toEqual([
      'Copy',
      'Paste',
      'separator',
      'Select All',
      'Clear Buffer',
    ]);
    expect(byLabel(items, 'Copy')?.enabled).toBe(false);
    expect(byLabel(items, 'Copy')?.accelerator).toBe('Ctrl+Shift+C');
    expect(byLabel(items, 'Paste')?.accelerator).toBe('Ctrl+Shift+V');
    expect(byLabel(items, 'Clear Buffer')?.accelerator).toBe('Ctrl+Shift+K');
    expect(items.every((item) => item.registerAccelerator !== true)).toBe(true);

    setPlatform('darwin');
    const mac = terminalMenuTemplate({ hasSelection: true, link: null }, win, vi.fn());
    expect(byLabel(mac, 'Copy')?.enabled).toBe(true);
    expect(byLabel(mac, 'Copy')?.accelerator).toBe('Cmd+C');
    expect(byLabel(mac, 'Paste')?.accelerator).toBe('Cmd+V');
  });

  it('copies and pastes through the window, as the keys do, and leaves the rest to the page', () => {
    const { win, contents } = fakeWindow();
    const send = vi.fn();
    const items = terminalMenuTemplate({ hasSelection: true, link: null }, win, send);
    click(byLabel(items, 'Copy'));
    click(byLabel(items, 'Paste'));
    expect(contents.copy).toHaveBeenCalledOnce();
    expect(contents.paste).toHaveBeenCalledOnce();
    click(byLabel(items, 'Select All'));
    click(byLabel(items, 'Clear Buffer'));
    expect(send.mock.calls).toEqual([
      ['menu:action', 'select-all'],
      ['menu:action', 'clear'],
    ]);
  });

  it('opens a link in the browser, or copies its address', () => {
    const { win } = fakeWindow();
    const link = 'https://example.com/docs';
    const items = terminalMenuTemplate({ hasSelection: false, link }, win, vi.fn());
    expect(items.slice(0, 3).map((item) => item.label ?? item.type)).toEqual([
      'Open Link',
      'Copy Link Address',
      'separator',
    ]);
    click(byLabel(items, 'Open Link'));
    expect(mocks.openExternal).toHaveBeenCalledWith(link);
    click(byLabel(items, 'Copy Link Address'));
    expect(mocks.writeText).toHaveBeenCalledWith(link);
  });
});

describe('openLink', () => {
  it('opens only http and https links', () => {
    openLink('http://example.com');
    openLink('https://example.com');
    openLink('file:///etc/passwd');
    openLink('javascript:alert(1)');
    expect(mocks.openExternal).toHaveBeenCalledTimes(2);
  });
});

describe('handleContextMenus', () => {
  const flags = { canCut: true, canCopy: false, canPaste: true, canSelectAll: true };

  it('gives a text field the standard edit menu', () => {
    const { win, rightClick } = fakeWindow();
    handleContextMenus(win);
    rightClick({}, { isEditable: true, editFlags: flags });
    expect(mocks.built).toHaveLength(1);
    expect(mocks.built[0]?.map((item) => item.role ?? item.type)).toEqual([
      'cut',
      'copy',
      'paste',
      'separator',
      'selectAll',
    ]);
    expect(mocks.built[0]?.find((item) => item.role === 'copy')?.enabled).toBe(false);
    expect(mocks.popup).toHaveBeenCalledOnce();
  });

  it('shows nothing for the rest of the page', () => {
    const { win, rightClick } = fakeWindow();
    handleContextMenus(win);
    rightClick({}, { isEditable: false, editFlags: flags });
    expect(mocks.built).toHaveLength(0);
  });
});
