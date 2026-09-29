// @vitest-environment jsdom
// A right-click in a terminal tells main whether the terminal has a selection and which link is
// under the mouse, unless the program in the terminal takes the mouse, and the menu's Select All
// acts on the focused pane.
import './stubTermi';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Activating a tab fits and focuses its terminals on the next frame, so the fake has both.
const runtime = vi.hoisted(() => ({
  hoveredLink: null as string | null,
  term: {
    hasSelection: (): boolean => false,
    selectAll: () => {},
    modes: { mouseTrackingMode: 'none' },
  },
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

const plain = { altKey: false, shiftKey: false };

async function start(platform = 'linux') {
  vi.spyOn(window.termi, 'info').mockResolvedValue({
    platform,
    version: '0.1.0',
    home: '/home/test',
  });
  vi.resetModules();
  const store = await import('@/renderer/appStore');
  await store.init();
  return store;
}

afterEach(() => {
  vi.restoreAllMocks();
  runtime.hoveredLink = null;
  runtime.term.modes.mouseTrackingMode = 'none';
});

describe('the terminal menu', () => {
  it('reports the selection and the hovered link', async () => {
    const show = vi.spyOn(window.termi, 'showTerminalMenu');
    const store = await start();
    const pane = store.getState().tabs[0]?.panes[0];
    expect(pane).toBeDefined();

    store.showTerminalMenu(pane!.id, plain);
    expect(show).toHaveBeenLastCalledWith({ hasSelection: false, link: null });

    vi.spyOn(runtime.term, 'hasSelection').mockReturnValue(true);
    runtime.hoveredLink = 'https://example.com';
    store.showTerminalMenu(pane!.id, plain);
    expect(show).toHaveBeenLastCalledWith({ hasSelection: true, link: 'https://example.com' });
  });

  // tmux with the mouse on, or vim with mouse=a, gets the right-click itself. The key xterm
  // holds the click back for, Option on macOS and Shift elsewhere, brings the menu back.
  it('leaves the right-click to a program that takes the mouse', async () => {
    for (const [platform, around, other] of [
      ['linux', { altKey: false, shiftKey: true }, { altKey: true, shiftKey: false }],
      ['darwin', { altKey: true, shiftKey: false }, { altKey: false, shiftKey: true }],
    ] as const) {
      const show = vi.spyOn(window.termi, 'showTerminalMenu');
      const store = await start(platform);
      const pane = store.getState().tabs[0]!.panes[0]!;
      runtime.term.modes.mouseTrackingMode = 'vt200';

      store.showTerminalMenu(pane.id, plain);
      store.showTerminalMenu(pane.id, other);
      expect(show, platform).not.toHaveBeenCalled();
      store.showTerminalMenu(pane.id, around);
      expect(show, platform).toHaveBeenCalledOnce();

      runtime.term.modes.mouseTrackingMode = 'none';
      store.showTerminalMenu(pane.id, plain);
      expect(show, platform).toHaveBeenCalledTimes(2);
      vi.restoreAllMocks();
    }
  });

  it('selects everything in the focused pane', async () => {
    const selectAll = vi.spyOn(runtime.term, 'selectAll');
    const store = await start();
    store.runAction('select-all');
    expect(selectAll).toHaveBeenCalledOnce();
  });
});
