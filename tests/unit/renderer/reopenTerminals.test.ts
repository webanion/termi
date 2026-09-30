// @vitest-environment jsdom
// Each pane of a saved command's tab remembers which of its terminals it runs, so a closed one
// can be reopened with the saved command's current command, in its folder, in its old place.
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

const trio: SavedCommand = {
  id: 'trio0001',
  name: 'Trio',
  terminals: [{ command: 'npm run api' }, { command: 'npm run web' }, { command: '' }],
  cwd: '~/shop',
  autoStart: true,
  layout: 'main-left',
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
    smoothScroll: true,
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
  // Close the pane that runs a terminal of the saved command.
  const close = (terminal: number) => {
    const pane = tab().panes.find((p) => p.terminal === terminal);
    if (!pane) throw new Error(`Terminal ${terminal} is not open`);
    store.removePane(pane.id);
  };
  const slots = () => tab().panes.map((p) => p.terminal);
  return { store, update, tab, close, slots };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a saved command's tab", () => {
  it('remembers which terminal each pane runs, and a split has none', async () => {
    const { store, tab, slots } = await startWith([trio]);
    expect(slots()).toEqual([0, 1, 2]);
    store.splitTab(tab().id);
    expect(slots()).toEqual([0, 1, 2, undefined]);
    expect(store.closedTerminals(tab())).toEqual([]);
  });

  it('has nothing to reopen in a plain tab', async () => {
    const { store, tab, slots } = await startWith();
    store.splitTab(tab().id);
    expect(slots()).toEqual([undefined, undefined]);
    store.removePane(tab().panes[1]?.id ?? '');
    expect(store.closedTerminals(tab())).toEqual([]);
    store.reopenTerminals(tab().id);
    expect(tab().panes).toHaveLength(1);
  });

  it('lists the closed terminals by their command', async () => {
    const { store, tab, close } = await startWith([trio]);
    close(1);
    close(2);
    expect(store.closedTerminals(tab())).toEqual([
      { terminal: 1, command: 'npm run web' },
      { terminal: 2, command: '' },
    ]);
  });
});

describe('reopening a closed terminal', () => {
  it('starts it with its command, in the folder, back in its place, with focus', async () => {
    const { store, tab, close, slots } = await startWith([trio]);
    close(1);
    expect(slots()).toEqual([0, 2]);
    store.reopenTerminals(tab().id, 1);
    expect(slots()).toEqual([0, 1, 2]);
    const reopened = tab().panes[1];
    expect(reopened?.command).toBe('npm run web');
    expect(tab().focusedPaneId).toBe(reopened?.id);
    expect(created.at(-1)).toMatchObject({
      paneId: reopened?.id,
      command: 'npm run web',
      cwd: '~/shop',
    });
    expect(store.closedTerminals(tab())).toEqual([]);
  });

  it('gives it back its title from the saved command', async () => {
    const titled: SavedCommand = {
      ...trio,
      terminals: [
        { command: 'npm run api', title: 'API' },
        { command: 'npm run web' },
        { command: '' },
      ],
    };
    const { store, tab, close } = await startWith([titled]);
    close(0);
    close(1);
    store.reopenTerminals(tab().id);
    expect(tab().panes.map((p) => p.title)).toEqual(['API', undefined, undefined]);
  });

  it('reopens a plain shell from the saved command', async () => {
    const { store, tab, close, slots } = await startWith([trio]);
    close(2);
    store.reopenTerminals(tab().id, 2);
    expect(slots()).toEqual([0, 1, 2]);
    expect(created.at(-1)).toMatchObject({ command: '', cwd: '~/shop' });
  });

  it('reopens only the terminal asked for', async () => {
    const { store, tab, close, slots } = await startWith([trio]);
    close(0);
    close(2);
    store.reopenTerminals(tab().id, 2);
    expect(slots()).toEqual([1, 2]);
    expect(store.closedTerminals(tab())).toEqual([{ terminal: 0, command: 'npm run api' }]);
  });

  it('reopens all of them in order, with a split kept after them', async () => {
    const { store, tab, close, slots } = await startWith([trio]);
    store.splitTab(tab().id);
    close(0);
    close(2);
    expect(slots()).toEqual([1, undefined]);
    store.reopenTerminals(tab().id);
    expect(slots()).toEqual([0, 1, 2, undefined]);
    expect(tab().panes.map((p) => p.command)).toEqual(['npm run api', 'npm run web', '', '']);
    expect(tab().focusedPaneId).toBe(tab().panes[0]?.id);
  });

  it('brings back every terminal when only a split is left', async () => {
    const { store, tab, close, slots } = await startWith([trio]);
    store.splitTab(tab().id);
    close(0);
    close(1);
    close(2);
    expect(slots()).toEqual([undefined]);
    store.reopenTerminals(tab().id);
    expect(slots()).toEqual([0, 1, 2, undefined]);
  });

  it('keeps a ready tab in the sidebar while the reopened shell starts', async () => {
    const { store, tab, close } = await startWith([trio]);
    for (const [i, runtime] of created.entries())
      runtime.events.onPtyCreated(runtime.paneId, { id: i + 1, pid: i + 1, title: 'zsh' });
    expect(tab().ready).toBe(true);
    close(1);
    store.reopenTerminals(tab().id);
    expect(tab().panes.every((p) => p.attached)).toBe(false);
    expect(tab().ready).toBe(true);
  });

  it('uses the saved command as it is now, and skips a terminal it no longer has', async () => {
    const { store, tab, close, slots } = await startWith([trio]);
    close(1);
    close(2);
    await store.saveCommand(trio.id, {
      name: 'Trio',
      terminals: [{ command: 'npm run api' }, { command: 'pnpm web' }],
      cwd: '~/shop-2',
      autoStart: true,
    });
    expect(store.closedTerminals(tab())).toEqual([{ terminal: 1, command: 'pnpm web' }]);
    store.reopenTerminals(tab().id);
    expect(slots()).toEqual([0, 1]);
    expect(created.at(-1)).toMatchObject({ command: 'pnpm web', cwd: '~/shop-2' });
  });

  it('has nothing to reopen once the saved command is deleted', async () => {
    const { store, tab, close } = await startWith([trio]);
    close(1);
    await store.deleteCommand(trio.id);
    expect(store.closedTerminals(tab())).toEqual([]);
    const before = created.length;
    store.reopenTerminals(tab().id);
    expect(tab().panes).toHaveLength(2);
    expect(created).toHaveLength(before);
  });

  it('stops at 4 terminals, with the toast a split shows', async () => {
    const { store, tab, close, slots } = await startWith([trio]);
    close(0);
    close(1);
    store.splitTab(tab().id);
    store.splitTab(tab().id);
    expect(slots()).toEqual([2, undefined, undefined]);
    store.reopenTerminals(tab().id);
    expect(slots()).toEqual([0, 2, undefined, undefined]);
    expect(store.getState().toast.text).toBe('A tab holds at most 4 terminals');
    const before = created.length;
    store.reopenTerminals(tab().id);
    expect(created).toHaveLength(before);
    expect(store.closedTerminals(tab())).toEqual([{ terminal: 1, command: 'npm run web' }]);
  });
});

describe('choosing a layout after reopening', () => {
  it('does not save it while a terminal is closed, and saves it once it is back', async () => {
    const { store, update, tab, close } = await startWith([trio]);
    close(1);
    store.setLayout(tab().id, 'columns');
    expect(update).not.toHaveBeenCalled();
    store.reopenTerminals(tab().id);
    expect(tab().panes).toHaveLength(trio.terminals.length);
    store.setLayout(tab().id, 'rows');
    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith({ commands: [{ ...trio, layout: 'rows' }] }),
    );
  });
});

describe('the reopen action', () => {
  it('reopens every closed terminal of the active tab, from its shortcut and menu item', async () => {
    const { store, close, slots } = await startWith([trio]);
    close(0);
    close(2);
    store.runAction('reopen-terminals');
    expect(slots()).toEqual([0, 1, 2]);
    store.runAction('reopen-terminals');
    expect(slots()).toEqual([0, 1, 2]);
  });
});
