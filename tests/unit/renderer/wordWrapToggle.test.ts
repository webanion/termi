// @vitest-environment jsdom
// Word wrap starts as the setting says, the shortcut toggles it in the focused terminal only, and
// the menu's check mark and the command palette follow the focused terminal.
import './stubTermi';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { paletteItems } from '@/renderer/palette';
import { DEFAULT_SETTINGS } from '@/shared/settings';

interface Created {
  paneId: string;
  wrap: boolean;
}

const created = vi.hoisted(() => [] as Created[]);
const setWrap = vi.hoisted(() => vi.fn());

vi.mock('@/renderer/terminalRuntime', () => ({
  createRuntime: (options: Created) => {
    created.push(options);
    return {};
  },
  // The store also fits and focuses panes in animation frames, which can run after a test ends.
  getRuntime: (paneId: string) => ({
    setWrap: (on: boolean) => setWrap(paneId, on),
    fit: () => {},
    focus: () => {},
    dispose: () => {},
  }),
  allRuntimes: () => [].values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

async function startWith(wordWrap: boolean) {
  vi.resetModules();
  created.length = 0;
  setWrap.mockClear();
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    ...DEFAULT_SETTINGS,
    guideSeen: true,
    wordWrap,
  });
  const menu = vi.spyOn(window.termi, 'setWordWrapMenu');
  const store = await import('@/renderer/appStore');
  await store.init();
  const tab = () => {
    const found = store.activeTab();
    if (!found) throw new Error('No active tab');
    return found;
  };
  return { store, menu, tab };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('word wrap', () => {
  it('starts each new terminal as the setting says', async () => {
    const { store, tab } = await startWith(false);
    store.splitTab(tab().id);
    expect(tab().panes.map((p) => p.wrap)).toEqual([false, false]);
    expect(created.map((c) => c.wrap)).toEqual([false, false]);
  });

  it('toggles the focused terminal only, from its shortcut or menu action', async () => {
    const { store, tab } = await startWith(true);
    store.splitTab(tab().id);
    const [first, second] = tab().panes;
    expect(tab().focusedPaneId).toBe(second?.id);
    store.runAction('toggle-word-wrap');
    expect(tab().panes.map((p) => p.wrap)).toEqual([true, false]);
    expect(setWrap).toHaveBeenLastCalledWith(second?.id, false);
    store.focusPane(first?.id ?? '');
    store.runAction('toggle-word-wrap');
    expect(tab().panes.map((p) => p.wrap)).toEqual([false, false]);
    expect(setWrap).toHaveBeenLastCalledWith(first?.id, false);
  });

  it("keeps the menu's check mark on the focused terminal, telling main only of a change", async () => {
    const { store, menu, tab } = await startWith(true);
    expect(menu.mock.calls).toEqual([[true]]);
    store.splitTab(tab().id);
    store.runAction('toggle-word-wrap');
    expect(menu).toHaveBeenLastCalledWith(false);
    store.focusPane(tab().panes[0]?.id ?? '');
    expect(menu).toHaveBeenLastCalledWith(true);
    expect(menu).toHaveBeenCalledTimes(3);
  });

  it('shows a check mark in the command palette while the focused terminal wraps', async () => {
    const { store } = await startWith(true);
    const item = (wrap: boolean) =>
      paletteItems('linux', [], [], { 'toggle-word-wrap': wrap }).find(
        (i) => i.key === 'toggle-word-wrap',
      );
    expect(store.focusedWrap()).toBe(true);
    expect(item(true)).toMatchObject({ label: 'Word Wrap', keys: 'Ctrl+Shift+Z', checked: true });
    expect(item(false)?.checked).toBe(false);
    expect(paletteItems('linux', []).find((i) => i.key === 'new-terminal')).not.toHaveProperty(
      'checked',
    );
  });
});
