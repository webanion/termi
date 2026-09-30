// @vitest-environment jsdom
// Saving a saved command from the dialog keeps its layout only while it fits the number of
// terminals, as the MCP server does.
import './stubTermi';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SavedCommand } from '@/shared/types';

vi.mock('@/renderer/terminalRuntime', () => ({
  createRuntime: () => ({}),
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
  cwd: '~/project',
  autoStart: false,
  layout: 'main-top',
};

async function startWith(commands: SavedCommand[]) {
  vi.resetModules();
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    commands,
    sidebarWidth: 232,
    sidebarHidden: false,
    fontSize: 13,
    cursorStyle: 'bar',
    cursorBlink: true,
    smoothScroll: true,
    wordWrap: true,
    guideSeen: true,
  });
  const update = vi.spyOn(window.termi.settings, 'update');
  const store = await import('@/renderer/appStore');
  await store.init();
  return { store, update };
}

const input = (terminals: string[], layout?: string) => ({
  name: 'Trio',
  terminals: terminals.map((command) => ({ command })),
  cwd: '~/project',
  autoStart: false,
  ...(layout === undefined ? {} : { layout }),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saveCommand', () => {
  it('drops a saved layout that does not fit the new number of terminals', async () => {
    const { store, update } = await startWith([trio]);
    await store.saveCommand(trio.id, input(['npm run api', 'npm run web']));
    const [saved] = update.mock.lastCall?.[0].commands ?? [];
    expect(saved).toEqual({ ...input(['npm run api', 'npm run web']), id: trio.id });
    expect(saved).not.toHaveProperty('layout');
  });

  it('keeps a saved layout that still fits', async () => {
    const { store, update } = await startWith([{ ...trio, layout: 'columns' }]);
    await store.saveCommand(trio.id, input(['npm run api', 'npm run web']));
    expect(update.mock.lastCall?.[0].commands?.[0]?.layout).toBe('columns');
  });

  it('writes the layout it is given, and none for 1 terminal', async () => {
    const { store, update } = await startWith([trio]);
    await store.saveCommand(trio.id, input(['npm run api', 'npm run web', ''], 'rows'));
    expect(update.mock.lastCall?.[0].commands?.[0]?.layout).toBe('rows');
    await store.saveCommand(null, input(['npm run dev'], 'columns'));
    expect(update.mock.lastCall?.[0].commands?.[1]).not.toHaveProperty('layout');
  });
});
