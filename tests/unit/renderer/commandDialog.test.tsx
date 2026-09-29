// @vitest-environment jsdom
// The saved command dialog offers the layouts for its number of terminals, keeps the selected
// one while it fits, and saves it on the command.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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

let container: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
});

async function openDialog(cmd: SavedCommand | null) {
  vi.resetModules();
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    commands: cmd ? [cmd] : [],
    sidebarWidth: 232,
    sidebarHidden: false,
    fontSize: 13,
    guideSeen: true,
  });
  const update = vi.spyOn(window.termi.settings, 'update');
  const store = await import('@/renderer/appStore');
  const { CommandDialog } = await import('@/renderer/CommandDialog');
  await store.init();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<CommandDialog />));
  act(() => store.openCommandDialog(cmd));
  return { update };
}

const picker = () => container.querySelector('#command-layout');
const options = () =>
  [...container.querySelectorAll<HTMLButtonElement>('#command-layout [role="radio"]')].map(
    (r) => r.dataset.layout,
  );
const selected = () =>
  container.querySelector<HTMLElement>('#command-layout [aria-checked="true"]')?.dataset.layout;
const click = (selector: string) =>
  act(() => container.querySelector<HTMLElement>(selector)?.click());
const addTerminal = () => click('#add-term-field');
const removeTerminal = (n: number) =>
  click(`.term-field:nth-child(${n}) button[title="Remove this terminal"]`);
const choose = (id: string) => click(`#command-layout [data-layout="${id}"]`);

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('the layout picker in the saved command dialog', () => {
  it('shows for 2 or more terminals, below them, with the default selected', async () => {
    await openDialog(null);
    expect(picker()).toBeNull();
    addTerminal();
    expect(options()).toEqual(['columns', 'rows']);
    expect(selected()).toBe('columns');
    const above = picker()?.closest('.field')?.previousElementSibling;
    expect(above?.querySelector('#term-fields')).not.toBeNull();
    expect(container.querySelector('#command-layout [data-layout="rows"]')?.textContent).toBe(
      'Stacked',
    );
  });

  it("selects the command's saved layout", async () => {
    await openDialog(trio);
    expect(options()).toEqual(['main-left', 'main-top', 'columns', 'rows']);
    expect(selected()).toBe('main-top');
  });

  it('keeps the selection while it fits the number of terminals, or moves to the default', async () => {
    await openDialog(trio);
    removeTerminal(3);
    expect(options()).toEqual(['columns', 'rows']);
    expect(selected()).toBe('columns');
    choose('rows');
    addTerminal();
    expect(selected()).toBe('rows');
    choose('main-top');
    addTerminal();
    expect(options()).toEqual(['grid', 'main-left', 'columns', 'rows']);
    expect(selected()).toBe('grid');
  });

  it('saves the selected layout on the command', async () => {
    const { update } = await openDialog(trio);
    choose('rows');
    click('#save-command');
    await vi.waitFor(() =>
      expect(update).toHaveBeenLastCalledWith({ commands: [{ ...trio, layout: 'rows' }] }),
    );
  });

  it('saves no layout for 1 terminal', async () => {
    const { update } = await openDialog(trio);
    removeTerminal(3);
    removeTerminal(2);
    expect(picker()).toBeNull();
    click('#save-command');
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    const { layout: _, ...rest } = trio;
    expect(update).toHaveBeenLastCalledWith({
      commands: [{ ...rest, terminals: [{ command: 'npm run api' }] }],
    });
  });
});
