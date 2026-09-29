// @vitest-environment jsdom
// A right-click in a terminal tells main whether the terminal has a selection and which link is
// under the mouse, and the menu's Select All acts on the focused pane.
import './stubTermi';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Activating a tab fits and focuses its terminals on the next frame, so the fake has both.
const runtime = vi.hoisted(() => ({
  hoveredLink: null as string | null,
  term: { hasSelection: (): boolean => false, selectAll: () => {} },
  fit: () => {},
  focus: () => {},
}));

vi.mock('@/renderer/terminalRuntime', () => ({
  createRuntime: () => runtime,
  getRuntime: () => runtime,
  allRuntimes: () => [runtime].values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

async function start() {
  vi.resetModules();
  const store = await import('@/renderer/appStore');
  await store.init();
  return store;
}

afterEach(() => {
  vi.restoreAllMocks();
  runtime.hoveredLink = null;
});

describe('the terminal menu', () => {
  it('reports the selection and the hovered link', async () => {
    const show = vi.spyOn(window.termi, 'showTerminalMenu');
    const store = await start();
    const pane = store.getState().tabs[0]?.panes[0];
    expect(pane).toBeDefined();

    store.showTerminalMenu(pane!.id);
    expect(show).toHaveBeenLastCalledWith({ hasSelection: false, link: null });

    vi.spyOn(runtime.term, 'hasSelection').mockReturnValue(true);
    runtime.hoveredLink = 'https://example.com';
    store.showTerminalMenu(pane!.id);
    expect(show).toHaveBeenLastCalledWith({ hasSelection: true, link: 'https://example.com' });
  });

  it('selects everything in the focused pane', async () => {
    const selectAll = vi.spyOn(runtime.term, 'selectAll');
    const store = await start();
    store.runAction('select-all');
    expect(selectAll).toHaveBeenCalledOnce();
  });
});
