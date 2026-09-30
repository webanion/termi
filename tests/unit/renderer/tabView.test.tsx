// @vitest-environment jsdom
// Tab view shows a tab's terminals one at a time, behind a strip of tabs. The choice is saved on
// the saved command like its layout, the pane shortcuts switch tabs, and a hidden terminal with
// new output is marked in the strip.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SavedCommand } from '@/shared/types';

const panes = vi.hoisted(() => [] as string[]); // pane ids, in the order their runtimes started

vi.mock('@/renderer/terminalRuntime', () => ({
  createRuntime: (options: { paneId: string }) => {
    panes.push(options.paneId);
    return {};
  },
  getRuntime: () => undefined,
  allRuntimes: () => [].values(),
  // Pty n is the shell of the nth pane.
  routePtyData: (ptyId: number) => ({ paneId: panes[ptyId - 1] }),
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

const trio: SavedCommand = {
  id: 'trio0001',
  name: 'Trio',
  terminals: [
    { command: 'npm run api', title: 'API' },
    { command: 'npm run web' },
    { command: '' },
  ],
  cwd: '~/project',
  autoStart: true,
  layout: 'main-top',
};

let container: HTMLElement | undefined;
let root: Root | undefined;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = container = undefined;
  vi.restoreAllMocks();
});

async function startWith(commands: SavedCommand[]) {
  vi.resetModules();
  panes.length = 0;
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    commands,
    sidebarWidth: 232,
    sidebarHidden: false,
    fontSize: 13,
    cursorStyle: 'bar',
    cursorBlink: true,
    smoothScroll: true,
    guideSeen: true,
  });
  let onData: (id: number, data: string) => void = () => {};
  vi.spyOn(window.termi.pty, 'onData').mockImplementation((callback) => {
    onData = callback;
    return () => {};
  });
  const update = vi.spyOn(window.termi.settings, 'update');
  const store = await import('@/renderer/appStore');
  await store.init();
  const tab = () => {
    const found = store.activeTab();
    if (!found) throw new Error('No active tab');
    return found;
  };
  const output = (pane: number) => onData(pane, 'output');
  return { store, update, tab, output };
}

describe('choosing tab view', () => {
  it('saves it on the saved command, keeping the layout, and a layout goes back to split', async () => {
    const { store, update, tab } = await startWith([trio]);
    expect(tab().view).toBe('split');
    store.showTabs(tab().id);
    expect(tab().view).toBe('tabs');
    await vi.waitFor(() =>
      expect(update).toHaveBeenLastCalledWith({ commands: [{ ...trio, view: 'tabs' }] }),
    );
    store.setLayout(tab().id, 'rows');
    expect(tab().view).toBe('split');
    await vi.waitFor(() =>
      expect(update).toHaveBeenLastCalledWith({ commands: [{ ...trio, layout: 'rows' }] }),
    );
  });

  it('opens a saved command in the view it was saved with', async () => {
    const { tab } = await startWith([{ ...trio, view: 'tabs' }]);
    expect(tab().view).toBe('tabs');
    expect(tab().layout).toBe('main-top');
  });

  it('does not save it after a split, since it would not fit the command', async () => {
    const { store, update, tab } = await startWith([trio]);
    store.splitTab(tab().id);
    store.showTabs(tab().id);
    expect(tab().view).toBe('tabs');
    expect(update).not.toHaveBeenCalled();
  });

  it('adds a split as a new tab, and shows it', async () => {
    const { store, tab } = await startWith([{ ...trio, view: 'tabs' }]);
    store.splitTab(tab().id);
    expect(tab().panes).toHaveLength(4);
    expect(tab().focusedPaneId).toBe(tab().panes[3]?.id);
  });
});

describe('moving between tabs', () => {
  it('shows the next and the previous terminal with the pane shortcuts, wrapping around', async () => {
    const { store, tab } = await startWith([{ ...trio, view: 'tabs' }]);
    const ids = tab().panes.map((p) => p.id);
    expect(tab().focusedPaneId).toBe(ids[0]);
    store.runAction('next-pane');
    expect(tab().focusedPaneId).toBe(ids[1]);
    store.runAction('prev-pane');
    store.runAction('prev-pane');
    expect(tab().focusedPaneId).toBe(ids[2]);
  });
});

describe('output in a hidden terminal', () => {
  it('marks its tab until it shows', async () => {
    const { store, tab, output } = await startWith([{ ...trio, view: 'tabs' }]);
    output(1);
    output(3);
    expect(tab().panes.map((p) => p.activity)).toEqual([false, false, true]);
    store.selectPane(tab().panes[2]?.id ?? '');
    expect(tab().panes.map((p) => p.activity)).toEqual([false, false, false]);
  });

  it('marks nothing while the tab is split, and the marks go when it splits', async () => {
    const { store, tab, output } = await startWith([trio]);
    output(2);
    expect(tab().panes.some((p) => p.activity)).toBe(false);
    store.showTabs(tab().id);
    output(2);
    expect(tab().panes[1]?.activity).toBe(true);
    store.setLayout(tab().id, 'rows');
    expect(tab().panes.some((p) => p.activity)).toBe(false);
  });

  it('marks nothing once 1 terminal is left', async () => {
    const { store, tab, output } = await startWith([{ ...trio, view: 'tabs' }]);
    store.removePane(tab().panes[1]?.id ?? '');
    store.removePane(tab().panes[1]?.id ?? '');
    expect(store.showsTabs(tab())).toBe(false);
    output(1);
    expect(tab().panes[0]?.activity).toBe(false);
  });
});

describe('the tab strip', () => {
  async function render() {
    const started = await startWith([{ ...trio, view: 'tabs' }]);
    const { TabView } = await import('@/renderer/TabView');
    const { useAppState } = await import('@/renderer/useAppState');
    function Active() {
      const found = useAppState((s) => s.tabs.find((t) => t.id === s.activeId));
      return found ? <TabView tab={found} state="active" /> : null;
    }
    container = document.createElement('div');
    document.body.appendChild(container);
    const mounted = createRoot(container);
    root = mounted;
    act(() => mounted.render(<Active />));
    const tabs = () => [...(container?.querySelectorAll<HTMLElement>('.pane-tab') ?? [])];
    const shown = () =>
      [...(container?.querySelectorAll<HTMLElement>('.term-pane.focused') ?? [])].map(
        (el) => el.dataset.paneId,
      );
    return { ...started, tabs, shown };
  }

  it('names each terminal like a pane head, and shows the focused one', async () => {
    const { tab, tabs, shown } = await render();
    expect(container?.querySelector('.tab-view.tabbed')).not.toBeNull();
    expect(container?.querySelector('.tab-view.split')).toBeNull();
    expect(tabs().map((t) => t.querySelector('.pane-name')?.textContent)).toEqual([
      'API',
      'npm run web',
      '',
    ]);
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(container?.querySelectorAll('.term-pane')).toHaveLength(3);
    expect(shown()).toEqual([tab().panes[0]?.id]);
  });

  it('shows a terminal when its tab is clicked, and marks one with new output', async () => {
    const { tab, tabs, shown, output } = await render();
    act(() => output(3));
    expect(tabs()[2]?.querySelector('.dot')?.classList.contains('activity')).toBe(true);
    act(() => tabs()[2]?.click());
    expect(shown()).toEqual([tab().panes[2]?.id]);
    expect(tabs()[2]?.classList.contains('on')).toBe(true);
    expect(tabs()[2]?.querySelector('.dot')?.classList.contains('activity')).toBe(false);
  });

  it('closes a terminal from its tab, and goes away when 1 is left', async () => {
    const { tab, tabs } = await render();
    act(() => tabs()[1]?.querySelector('button')?.click());
    expect(tab().panes).toHaveLength(2);
    expect(tabs()).toHaveLength(2);
    act(() => tabs()[1]?.querySelector('button')?.click());
    expect(tabs()).toHaveLength(0);
    expect(container?.querySelector('.tab-view.tabbed')).toBeNull();
  });
});
