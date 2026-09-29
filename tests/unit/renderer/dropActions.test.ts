// @vitest-environment jsdom
// What the store does with a drop: a drop on a terminal types the paths into that pane.
import './stubTermi';
import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeRuntime {
  paste: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
}

const runtimes = vi.hoisted(() => new Map<string, FakeRuntime>());

vi.mock('../../../src/renderer/terminalRuntime', () => ({
  createRuntime: ({ paneId }: { paneId: string }) => {
    const runtime = { paste: vi.fn(), focus: vi.fn() };
    runtimes.set(paneId, runtime);
    return runtime;
  },
  getRuntime: (paneId: string) => runtimes.get(paneId),
  allRuntimes: () => runtimes.values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

async function start() {
  vi.resetModules();
  runtimes.clear();
  const store = await import('../../../src/renderer/appStore');
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

describe('a drop on a terminal', () => {
  it('types the quoted paths into the pane under the pointer, and focuses it', async () => {
    const { store, tab } = await start();
    store.splitTab(tab().id);
    const [first, second] = tab().panes.map((p) => p.id);
    expect(tab().focusedPaneId).toBe(second);

    store.dropOnPane(first ?? '', [
      { path: "/tmp/it's.png", folder: false },
      { path: '/tmp/a folder', folder: true },
    ]);
    const runtime = runtimes.get(first ?? '');
    expect(runtime?.paste).toHaveBeenCalledWith("'/tmp/it'\\''s.png' '/tmp/a folder' ");
    expect(runtime?.focus).toHaveBeenCalled();
    expect(runtimes.get(second ?? '')?.paste).not.toHaveBeenCalled();
    expect(tab().focusedPaneId).toBe(first);
  });

  it('does nothing without paths, or for a pane that is gone', async () => {
    const { store, tab } = await start();
    const pane = tab().panes[0]?.id ?? '';
    store.dropOnPane(pane, []);
    store.dropOnPane('gone', [{ path: '/tmp/a', folder: false }]);
    expect(runtimes.get(pane)?.paste).not.toHaveBeenCalled();
  });
});
