// @vitest-environment jsdom
// A saved command's closed terminals in the page. The header's Reopen control shows while the
// active tab has any, and its menu lists them by command, reopens one or all, and works from the
// keyboard. The saved command's row in the sidebar says how many of its terminals are open.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RuntimeEvents } from '@/renderer/terminalRuntime';
import type { SavedCommand } from '@/shared/types';

interface Created {
  paneId: string;
  events: RuntimeEvents;
}

const created = vi.hoisted(() => [] as Created[]);

vi.mock('@/renderer/terminalRuntime', () => ({
  createRuntime: (options: Created) => {
    created.push(options);
    return {};
  },
  getRuntime: () => undefined,
  allRuntimes: () => [].values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

const PAYLOAD = '<img src=x onerror="window.__pwned = true">';

const trio: SavedCommand = {
  id: 'trio0001',
  name: 'Trio',
  terminals: [{ command: 'npm run api' }, { command: `npm run web\n${PAYLOAD}` }, { command: '' }],
  cwd: '~/shop',
  autoStart: true,
};

let container: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

// The header and the saved commands of a running saved command's tab, with its shells started.
async function renderHeader() {
  vi.resetModules();
  created.length = 0;
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    commands: [trio],
    sidebarWidth: 232,
    sidebarHidden: false,
    fontSize: 13,
    cursorStyle: 'bar',
    cursorBlink: true,
    smoothScroll: true,
    wordWrap: true,
    guideSeen: true,
  });
  const store = await import('@/renderer/appStore');
  const { MainHeader } = await import('@/renderer/MainHeader');
  const { CommandList } = await import('@/renderer/CommandList');
  await store.init();
  for (const [i, runtime] of created.entries())
    runtime.events.onPtyCreated(runtime.paneId, { id: i + 1, pid: i + 1, title: 'zsh' });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <>
        <MainHeader />
        <CommandList />
      </>,
    ),
  );
  const tab = () => {
    const found = store.activeTab();
    if (!found) throw new Error('No active tab');
    return found;
  };
  const close = (terminal: number) =>
    act(() => store.removePane(tab().panes.find((p) => p.terminal === terminal)?.id ?? ''));
  const control = () => container.querySelector('#reopen-control');
  const button = () => container.querySelector<HTMLButtonElement>('#reopen-terminals');
  const items = () => [...container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  const key = (key: string) =>
    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    });
  return { store, tab, close, control, button, items, key };
}

describe('the Reopen control', () => {
  it('hides while every terminal of the saved command is open', async () => {
    const { control, button } = await renderHeader();
    expect(control()?.classList.contains('show')).toBe(false);
    expect(button()?.disabled).toBe(true);
    expect(container.querySelector('.main-head')?.classList.contains('has-reopen')).toBe(false);
  });

  it('lists the closed terminals by command, a plain shell by its name, and Reopen all', async () => {
    const { close, control, button, items } = await renderHeader();
    close(1);
    close(2);
    expect(control()?.classList.contains('show')).toBe(true);
    expect(container.querySelector('.main-head')?.classList.contains('has-reopen')).toBe(true);
    act(() => button()?.click());
    expect(button()?.getAttribute('aria-expanded')).toBe('true');
    expect(items().map((i) => i.textContent)).toEqual([
      `npm run web; ${PAYLOAD}`,
      'zsh',
      'Reopen allCtrl+Shift+R',
    ]);
    // A command is text, never markup.
    expect(container.querySelector('#reopen-menu img')).toBeNull();
    expect((window as { __pwned?: boolean }).__pwned).toBeUndefined();
    expect(items()[0]?.title).toBe(`npm run web\n${PAYLOAD}`);
  });

  it('reopens the terminal chosen, and closes the menu', async () => {
    const { tab, close, button, items } = await renderHeader();
    close(1);
    close(2);
    act(() => button()?.click());
    act(() => items()[1]?.click());
    expect(tab().panes.map((p) => p.terminal)).toEqual([0, 2]);
    expect(items()).toHaveLength(0);
    act(() => button()?.click());
    expect(items()).toHaveLength(2);
  });

  it('reopens all of them, and then hides', async () => {
    const { tab, close, control, button, items } = await renderHeader();
    close(0);
    close(2);
    act(() => button()?.click());
    act(() => items().at(-1)?.click());
    expect(tab().panes.map((p) => p.terminal)).toEqual([0, 1, 2]);
    expect(control()?.classList.contains('show')).toBe(false);
  });

  it('works from the keyboard, and closes on Escape', async () => {
    const { close, button, items, key } = await renderHeader();
    close(1);
    button()?.focus();
    key('ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    key('ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    key('ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    key('End');
    expect(document.activeElement?.textContent).toContain('Reopen all');
    key('Escape');
    expect(items()).toHaveLength(0);
    expect(document.activeElement).toBe(button());
  });

  it('closes on a press outside it', async () => {
    const { close, button, items } = await renderHeader();
    close(1);
    act(() => button()?.click());
    expect(items()).toHaveLength(2);
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(items()).toHaveLength(0);
  });

  it('has nothing to offer once the saved command is deleted', async () => {
    const { store, close, control } = await renderHeader();
    close(1);
    await act(() => store.deleteCommand(trio.id));
    expect(control()?.classList.contains('show')).toBe(false);
  });
});

describe("the saved command's row", () => {
  const count = () => container.querySelector('#command-list .item-count')?.textContent ?? '';

  it('says how many of its terminals are open while some are closed', async () => {
    const { store, tab, close } = await renderHeader();
    expect(count()).toBe('');
    close(1);
    expect(count()).toBe('2 of 3');
    close(2);
    expect(count()).toBe('1 of 3');
    act(() => store.reopenTerminals(tab().id));
    expect(count()).toBe('');
  });

  it('only switches to the tab on a click, and reopens nothing', async () => {
    const { store, tab, close } = await renderHeader();
    const first = tab().id;
    close(1);
    act(() => store.openTab());
    expect(store.activeTab()?.id).not.toBe(first);
    act(() => container.querySelector<HTMLElement>('#command-list .item')?.click());
    expect(store.activeTab()?.id).toBe(first);
    expect(tab().panes.map((p) => p.terminal)).toEqual([0, 2]);
    expect(count()).toBe('2 of 3');
  });
});
