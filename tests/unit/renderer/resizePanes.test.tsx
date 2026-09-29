// @vitest-environment jsdom
// The panes of a split tab resize from the handles on the lines between them. The sizes stay on
// the running tab, and go back to equal when the layout or the number of terminals changes.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/renderer/terminalRuntime', () => ({
  createRuntime: () => ({}),
  getRuntime: () => undefined,
  allRuntimes: () => [].values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

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

// A tab with three terminals, in its default layout, "Large on the left". Its grid is 800 by
// 600 pixels, so each of its two columns and two rows starts at 400 and 300 pixels.
async function splitInThree() {
  vi.resetModules();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
  const store = await import('@/renderer/appStore');
  const { TabView } = await import('@/renderer/TabView');
  const { useAppState } = await import('@/renderer/useAppState');
  await store.init();
  const tab = () => {
    const found = store.activeTab();
    if (!found) throw new Error('No active tab');
    return found;
  };
  store.splitTab(tab().id);
  store.splitTab(tab().id);

  function Active() {
    const found = useAppState((s) => s.tabs.find((t) => t.id === s.activeId));
    return found ? <TabView tab={found} state="active" /> : null;
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  const mounted = createRoot(container);
  root = mounted;
  act(() => mounted.render(<Active />));

  const view = () => container?.querySelector<HTMLElement>('.tab-view');
  const handle = (orientation: string) => {
    const found = container?.querySelector<HTMLElement>(
      `[role="separator"][aria-orientation="${orientation}"]`,
    );
    if (!found) throw new Error(`No ${orientation} handle`);
    return found;
  };
  const press = (element: HTMLElement, key: string, times = 1) => {
    for (let i = 0; i < times; i++) {
      act(() => {
        element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      });
    }
  };
  return { store, tab, view, handle, press };
}

describe('the handles between panes', () => {
  it('sit on each line between two panes, and start equal', async () => {
    const { view, handle } = await splitInThree();
    expect(view()?.querySelectorAll('[role="separator"]')).toHaveLength(2);
    // The line between the columns runs down the whole tab. The line between the rows runs
    // only along the right column, since the large pane spans both rows.
    expect(handle('vertical').style.gridRow).toBe('1 / 3');
    expect(handle('vertical').style.gridColumn).toBe('2');
    expect(handle('horizontal').style.gridColumn).toBe('2 / 3');
    expect(handle('horizontal').style.gridRow).toBe('2');
    expect(handle('vertical').tabIndex).toBe(0);
    expect(handle('vertical').getAttribute('aria-valuenow')).toBe('50');
    expect(view()?.style.gridTemplateColumns).toBe('minmax(0, 1fr) minmax(0, 1fr)');
  });

  it('move with the arrow keys along their own axis only', async () => {
    const { tab, view, handle, press } = await splitInThree();
    press(handle('vertical'), 'ArrowRight');
    expect(tab().tracks?.columns).toEqual([1.05, 0.95]);
    expect(view()?.style.gridTemplateColumns).toBe('minmax(0, 1.05fr) minmax(0, 0.95fr)');
    expect(handle('vertical').getAttribute('aria-valuenow')).toBe('53');
    press(handle('vertical'), 'ArrowDown');
    expect(tab().tracks?.columns).toEqual([1.05, 0.95]);

    press(handle('horizontal'), 'ArrowUp');
    expect(tab().tracks?.rows).toEqual([0.9333, 1.0667]);
    expect(tab().tracks?.columns).toEqual([1.05, 0.95]);
  });

  it('stop at the minimum pane size', async () => {
    const { tab, handle, press } = await splitInThree();
    press(handle('vertical'), 'ArrowLeft', 30);
    expect(tab().tracks?.columns).toEqual([0.4, 1.6]); // 160 pixels of 800
    press(handle('horizontal'), 'ArrowDown', 30);
    expect(tab().tracks?.rows).toEqual([1.6667, 0.3333]); // 100 pixels of 600
  });

  it('reset their line to equal with a double-click', async () => {
    const { tab, handle, press } = await splitInThree();
    press(handle('vertical'), 'ArrowRight', 3);
    press(handle('horizontal'), 'ArrowDown', 2);
    act(() => {
      handle('vertical').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(tab().tracks?.columns).toEqual([1, 1]);
    expect(tab().tracks?.rows).not.toEqual([1, 1]);
  });
});

describe('the sizes of a split tab', () => {
  it('go back to equal when the layout changes', async () => {
    const { store, tab, handle, press } = await splitInThree();
    press(handle('vertical'), 'ArrowRight');
    store.setLayout(tab().id, 'columns');
    expect(tab().tracks).toBeNull();
  });

  it('go back to equal when a terminal is added or closed', async () => {
    const { store, tab, handle, press } = await splitInThree();
    press(handle('vertical'), 'ArrowRight');
    store.splitTab(tab().id);
    expect(tab().tracks).toBeNull();
    press(handle('vertical'), 'ArrowRight');
    expect(tab().tracks).not.toBeNull();
    store.removePane(tab().panes[0]?.id ?? '');
    expect(tab().tracks).toBeNull();
  });

  it('take only as many sizes as the grid has tracks', async () => {
    const { store, tab } = await splitInThree();
    store.resizeTracks(tab().id, 'columns', [1, 1, 1]);
    expect(tab().tracks).toBeNull();
    store.resizeTracks(tab().id, 'rows', [1.5, 0.5]);
    expect(tab().tracks).toEqual({ columns: [1, 1], rows: [1.5, 0.5] });
  });
});
