// @vitest-environment jsdom
// The guide opens by itself on the first launch, and is marked as seen so it does not again.
import './stubTermi';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/renderer/terminalRuntime', () => ({
  createRuntime: () => ({}),
  getRuntime: () => undefined,
  allRuntimes: () => [].values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

async function startWith(guideSeen: boolean) {
  vi.resetModules();
  const settings = {
    commands: [],
    sidebarWidth: 232,
    sidebarHidden: false,
    fontSize: 13,
    guideSeen,
  };
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue(settings);
  const update = vi.spyOn(window.termi.settings, 'update');
  const store = await import('../../../src/renderer/appStore');
  await store.init();
  return { store, update };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the first launch', () => {
  it('opens the guide and marks it as seen', async () => {
    const { store, update } = await startWith(false);
    expect(store.getState().overlay).toBe('guide');
    expect(update).toHaveBeenCalledWith({ guideSeen: true });
  });

  it('does not open the guide once it has been seen', async () => {
    const { store, update } = await startWith(true);
    expect(store.getState().overlay).toBeNull();
    expect(update).not.toHaveBeenCalledWith({ guideSeen: true });
  });

  it('toggles a help overlay with its own action, and closes it for another', async () => {
    const { store } = await startWith(true);
    store.runAction('command-palette');
    expect(store.getState().overlay).toBe('palette');
    store.runAction('command-palette');
    expect(store.getState().overlay).toBeNull();
    store.runAction('show-shortcuts');
    store.runAction('close-terminal');
    expect(store.getState().overlay).toBeNull();
  });
});
