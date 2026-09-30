// View > Word Wrap is a checkbox that shows what the page says about the focused terminal. A click
// does not check or clear it by itself: the page toggles the terminal and then says so.
import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  template: [] as MenuItemConstructorOptions[],
  live: { checked: true },
}));

vi.mock('electron', () => ({
  app: { isPackaged: true },
  Menu: {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => {
      mocks.template = template;
      return {};
    },
    setApplicationMenu: () => {},
    getApplicationMenu: () => ({
      getMenuItemById: (id: string) => (id === 'toggle-word-wrap' ? mocks.live : null),
    }),
  },
}));

const { buildMenu, setWordWrapChecked } = await import('@/main/menu');

function findItem(items: MenuItemConstructorOptions[], id: string): MenuItemConstructorOptions {
  for (const item of items) {
    if (item.id === id) return item;
    if (Array.isArray(item.submenu)) {
      const found = findItem(item.submenu, id);
      if (found.id) return found;
    }
  }
  return {};
}

type Click = (item: { checked: boolean }) => void;

describe('View > Word Wrap', () => {
  it('is a checkbox that starts checked', () => {
    buildMenu(vi.fn());
    const item = findItem(mocks.template, 'toggle-word-wrap');
    expect(item).toMatchObject({ type: 'checkbox', checked: true, label: 'Word Wrap' });
  });

  it('follows what the page says, and a rebuilt menu keeps it', () => {
    setWordWrapChecked(false);
    expect(mocks.live.checked).toBe(false);
    buildMenu(vi.fn());
    expect(findItem(mocks.template, 'toggle-word-wrap').checked).toBe(false);
    setWordWrapChecked(true);
    expect(mocks.live.checked).toBe(true);
  });

  it('asks the page to toggle, and keeps the check until the page answers', () => {
    const send = vi.fn();
    buildMenu(send);
    const click = findItem(mocks.template, 'toggle-word-wrap').click as unknown as Click;
    // Electron clears the item before the click runs.
    const clicked = { checked: false };
    click(clicked);
    expect(clicked.checked).toBe(true);
    expect(send).toHaveBeenCalledWith('menu:action', 'toggle-word-wrap');
  });
});
