// @vitest-environment jsdom
// The sidebar's rows work from the keyboard. Each row's name is a button that does what a click
// on the row does, and F2 on a running terminal's row renames it, as a double-click does.
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

const running: SavedCommand = {
  id: 'runs0001',
  name: 'Dev',
  terminals: [{ command: 'npm run dev' }],
  cwd: '~/shop',
  autoStart: true,
};
const stopped: SavedCommand = {
  id: 'stop0001',
  name: 'Tests',
  terminals: [{ command: 'npm test' }],
  cwd: '~/shop',
  autoStart: false,
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

async function renderSidebar() {
  vi.resetModules();
  created.length = 0;
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    commands: [running, stopped],
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
  const { CommandList } = await import('@/renderer/CommandList');
  const { TerminalList } = await import('@/renderer/TerminalList');
  await store.init();
  // Shells start for every runtime so far, and for any a test opens later.
  const startShells = () =>
    act(() => {
      for (const [i, runtime] of created.entries())
        runtime.events.onPtyCreated(runtime.paneId, { id: i + 1, pid: i + 1, title: 'zsh' });
    });
  startShells();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <>
        <TerminalList />
        <CommandList />
      </>,
    ),
  );
  const rowButton = (list: string, index: number) =>
    container.querySelectorAll<HTMLElement>(`${list} .item .item-name`)[index];
  return { store, startShells, rowButton };
}

describe('the sidebar rows', () => {
  it('makes each row name a button that does what a click on the row did', async () => {
    const { store, startShells, rowButton } = await renderSidebar();
    expect(rowButton('#command-list', 0)?.tagName).toBe('BUTTON');
    expect(rowButton('#terminal-list', 0)?.tagName).toBe('BUTTON');
    expect(store.getState().tabs).toHaveLength(1);
    const dev = store.getState().tabs[0]?.id;

    act(() => rowButton('#command-list', 1)?.click());
    startShells();
    expect(store.getState().tabs).toHaveLength(2);
    expect(store.activeTab()?.commandId).toBe(stopped.id);

    act(() => rowButton('#command-list', 0)?.click());
    expect(store.activeTab()?.id).toBe(dev);

    act(() => rowButton('#terminal-list', 1)?.click());
    expect(store.activeTab()?.commandId).toBe(stopped.id);
  });

  it('renames a running terminal with F2, as a double-click does', async () => {
    const { store, rowButton } = await renderSidebar();
    const editor = () => container.querySelector<HTMLElement>('#terminal-list [role="textbox"]');
    act(() => {
      rowButton('#terminal-list', 0)?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'F2', bubbles: true }),
      );
    });
    expect(editor()).not.toBeNull();
    expect(document.activeElement).toBe(editor());
    act(() => {
      const el = editor();
      if (el) el.textContent = 'Shop dev';
      el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(store.getState().tabs[0]?.name).toBe('Shop dev');
    expect(editor()).toBeNull();

    act(() => {
      rowButton('#terminal-list', 0)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(editor()).not.toBeNull();
  });
});
