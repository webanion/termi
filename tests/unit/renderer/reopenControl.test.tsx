// @vitest-environment jsdom
// The header's Reopen control: it shows while the active tab's saved command has closed
// terminals, and its menu lists them by command, reopens one or all, and works from the keyboard.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RuntimeEvents } from '../../../src/renderer/terminalRuntime';
import type { SavedCommand } from '../../../src/shared/types';

interface Created {
  paneId: string;
  events: RuntimeEvents;
}

const created = vi.hoisted(() => [] as Created[]);

vi.mock('../../../src/renderer/terminalRuntime', () => ({
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

// The header of a running saved command's tab, with its shells started.
async function renderHeader() {
  vi.resetModules();
  created.length = 0;
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    commands: [trio],
    sidebarWidth: 232,
    sidebarHidden: false,
    fontSize: 13,
    guideSeen: true,
  });
  const store = await import('../../../src/renderer/appStore');
  const { MainHeader } = await import('../../../src/renderer/MainHeader');
  await store.init();
  for (const [i, runtime] of created.entries())
    runtime.events.onPtyCreated(runtime.paneId, { id: i + 1, pid: i + 1, title: 'zsh' });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MainHeader />));
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
