// @vitest-environment jsdom
// A terminal of a saved command can have a title. Its pane head shows the title in place of the
// command, which stays in the tooltip. A split, and a command with 1 terminal, have no title.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PaneState, TabState } from '@/renderer/appStore';
import type { SavedCommand } from '@/shared/types';

const created = vi.hoisted(() => [] as { paneId: string; command: string }[]);

vi.mock('@/renderer/terminalRuntime', () => ({
  createRuntime: (options: { paneId: string; command: string }) => {
    created.push(options);
    return {};
  },
  getRuntime: () => undefined,
  allRuntimes: () => [].values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

const shop: SavedCommand = {
  id: 'shop0001',
  name: 'Shop',
  terminals: [
    { command: 'npm run dev --workspace=@shop/api', title: 'API' },
    { command: 'npm run dev --workspace=@shop/web' },
    { command: '', title: 'Database' },
  ],
};
const single: SavedCommand = {
  id: 'one00001',
  name: 'One',
  terminals: [{ command: 'npm test', title: 'Tests' }],
};

async function start() {
  vi.resetModules();
  created.length = 0;
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    commands: [shop, single],
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
  await store.init();
  const tab = () => {
    const found = store.activeTab();
    if (!found) throw new Error('No active tab');
    return found;
  };
  return { store, tab };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('opening a saved command', () => {
  it('gives each pane the title of its terminal, and runs the same commands', async () => {
    const { store, tab } = await start();
    store.runCommand(shop);
    expect(tab().panes.map((p) => p.title)).toEqual(['API', undefined, 'Database']);
    expect(tab().panes.map((p) => p.command)).toEqual(shop.terminals.map((t) => t.command));
    expect(created.slice(-3).map((c) => c.command)).toEqual(shop.terminals.map((t) => t.command));
  });

  it('gives no title to the terminal of a command with only 1', async () => {
    const { store, tab } = await start();
    store.runCommand(single);
    expect(tab().panes[0]?.title).toBeUndefined();
    store.splitTab(tab().id);
    expect(tab().panes.map((p) => p.title)).toEqual([undefined, undefined]);
  });

  it('gives no title to a split', async () => {
    const { store, tab } = await start();
    store.runCommand(shop);
    store.splitTab(tab().id);
    expect(tab().panes).toHaveLength(4);
    expect(tab().panes[3]?.title).toBeUndefined();
  });
});

describe('the pane head', () => {
  let container: HTMLElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const pane = (overrides: Partial<PaneState>): PaneState => ({
    id: 'p1',
    command: '',
    proc: 'zsh',
    shellName: 'zsh',
    attached: true,
    activity: false,
    wrap: true,
    ...overrides,
  });

  async function head(shown: PaneState, panes = 2) {
    const { TerminalPane } = await import('@/renderer/TerminalPane');
    const others = Array.from({ length: panes - 1 }, (_, i) => pane({ id: `other${i}` }));
    const tab: TabState = {
      id: 1,
      name: 'Shop',
      customName: true,
      commandId: null,
      cwd: undefined,
      activity: false,
      layout: null,
      view: 'split',
      tracks: null,
      panes: [shown, ...others],
      focusedPaneId: shown.id,
      ready: true,
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<TerminalPane tab={tab} pane={shown} area={undefined} />));
    const name = container.querySelector('.pane-name');
    return {
      name: name?.textContent,
      tooltip: name?.getAttribute('title'),
      proc: container.querySelector('.pane-proc')?.textContent,
      busy: container.querySelector('.pane-head .dot.busy') !== null,
    };
  }

  const api = 'npm run dev --workspace=@shop/api';

  it('shows the title in place of the command, and keeps the command in the tooltip', async () => {
    expect(await head(pane({ command: api, title: 'API' }))).toMatchObject({
      name: 'API',
      tooltip: api,
    });
  });

  it('shows the command of a terminal without a title, as before', async () => {
    expect(await head(pane({ command: `cd api\n${api}` }))).toMatchObject({
      name: `cd api; ${api}`,
      tooltip: `cd api\n${api}`,
    });
  });

  it("shows the title of a plain shell, with the shell's name in the tooltip", async () => {
    expect(await head(pane({ title: 'Database' }))).toMatchObject({
      name: 'Database',
      tooltip: 'zsh',
    });
    expect(await head(pane({}))).toMatchObject({ name: 'zsh', tooltip: 'zsh' });
  });

  it('keeps the busy dot and the running program next to a title', async () => {
    expect(await head(pane({ command: api, title: 'API', proc: 'node' }))).toEqual({
      name: 'API',
      tooltip: api,
      proc: 'node',
      busy: true,
    });
  });

  it('shows no head text while the tab has only 1 pane', async () => {
    expect(await head(pane({ command: api, title: 'API' }), 1)).toMatchObject({
      name: '',
      tooltip: null,
    });
  });

  it('shows a title as text', async () => {
    const payload = '<img src=x onerror="window.__pwned = true">';
    expect(await head(pane({ command: 'ls', title: payload }))).toMatchObject({ name: payload });
    expect(container.querySelector('img')).toBeNull();
    expect((window as { __pwned?: boolean }).__pwned).toBeUndefined();
  });
});
