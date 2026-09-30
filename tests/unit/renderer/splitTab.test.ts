// @vitest-environment jsdom
// Splitting a tab adds a plain shell to it, up to 4, and a layout is only saved to a saved
// command while the tab has as many terminals as the command.
import './stubTermi';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeEvents } from '@/renderer/terminalRuntime';
import type { SavedCommand } from '@/shared/types';

interface Created {
  paneId: string;
  command: string;
  cwd?: string;
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

const pair: SavedCommand = {
  id: 'pair0001',
  name: 'Pair',
  terminals: [{ command: 'npm run dev' }, { command: '' }],
  cwd: '~/project',
  autoStart: true,
  layout: 'rows',
};

async function startWith(commands: SavedCommand[] = []) {
  vi.resetModules();
  created.length = 0;
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    commands,
    sidebarWidth: 232,
    sidebarHidden: false,
    fontSize: 13,
    cursorStyle: 'bar',
    cursorBlink: true,
    guideSeen: true,
  });
  const update = vi.spyOn(window.termi.settings, 'update');
  const store = await import('@/renderer/appStore');
  await store.init();
  const tab = () => {
    const found = store.activeTab();
    if (!found) throw new Error('No active tab');
    return found;
  };
  return { store, update, tab };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('splitting a tab', () => {
  it('adds a plain shell to a plain tab and focuses it', async () => {
    const { store, tab } = await startWith();
    const first = tab().panes[0]?.id;
    store.splitTab(tab().id);
    expect(tab().panes).toHaveLength(2);
    const added = tab().panes[1];
    expect(added?.command).toBe('');
    expect(added?.id).not.toBe(first);
    expect(tab().focusedPaneId).toBe(added?.id);
    expect(created.at(-1)).toMatchObject({ paneId: added?.id, command: '', cwd: undefined });
  });

  it("starts the new shell in the saved command's folder, and leaves the command as it is", async () => {
    const { store, update, tab } = await startWith([pair]);
    store.splitTab(tab().id);
    expect(tab().panes.map((p) => p.command)).toEqual(['npm run dev', '', '']);
    expect(created.at(-1)).toMatchObject({ command: '', cwd: '~/project' });
    expect(tab().commandId).toBe('pair0001');
    expect(update).not.toHaveBeenCalled();
  });

  it('stops at 4 terminals', async () => {
    const { store, tab } = await startWith();
    for (let i = 0; i < 5; i++) store.splitTab(tab().id);
    expect(tab().panes).toHaveLength(4);
    expect(created).toHaveLength(4);
    expect(store.getState().toast.text).toBe('A tab holds at most 4 terminals');
  });

  it('runs from its shortcut and menu action on the active tab', async () => {
    const { store, tab } = await startWith();
    store.runAction('split-terminal');
    expect(tab().panes).toHaveLength(2);
  });

  it('keeps a tab that was ready in the sidebar while the new shell starts', async () => {
    const { store, tab } = await startWith();
    const started = (runtime: Created | undefined, id: number) =>
      runtime?.events.onPtyCreated(runtime.paneId, { id, pid: id, title: 'zsh' });
    started(created[0], 1);
    expect(tab().ready).toBe(true);
    store.splitTab(tab().id);
    store.splitTab(tab().id);
    expect(tab().ready).toBe(true);
    started(created[1], 2);
    expect(tab().ready).toBe(true);
    // Closing a pane while the last shell is still starting keeps the tab in the sidebar too.
    store.removePane(created[0]?.paneId ?? '');
    expect(tab().panes).toHaveLength(2);
    expect(tab().ready).toBe(true);
  });
});

describe('choosing a layout', () => {
  it('saves the layout to the saved command while the tab has as many terminals', async () => {
    const { store, update, tab } = await startWith([pair]);
    store.setLayout(tab().id, 'columns');
    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith({ commands: [{ ...pair, layout: 'columns' }] }),
    );
  });

  it('does not save it after a split, since it would not fit the command', async () => {
    const { store, update, tab } = await startWith([pair]);
    store.splitTab(tab().id);
    store.setLayout(tab().id, 'columns');
    expect(tab().layout).toBe('columns');
    expect(update).not.toHaveBeenCalled();
  });
});
