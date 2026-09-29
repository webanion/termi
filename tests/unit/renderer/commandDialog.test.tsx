// @vitest-environment jsdom
// The saved command dialog offers the layouts for its number of terminals, keeps the selected
// one while it fits, and saves it on the command. It gives each terminal a title field once there
// are 2 or more, and saves a command with 1 terminal without titles.
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

const shop: SavedCommand = {
  id: 'shop0001',
  name: 'Shop',
  terminals: [
    { command: 'npm run api', title: 'API' },
    { command: 'npm run web', title: 'Web' },
    { command: '' },
  ],
  cwd: '~/shop',
  layout: 'main-left',
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
    expect(options()).toEqual(['columns', 'rows', 'tabs']);
    expect(selected()).toBe('columns');
    const above = picker()?.closest('.field')?.previousElementSibling;
    expect(above?.querySelector('#term-fields')).not.toBeNull();
    expect(container.querySelector('#command-layout [data-layout="rows"]')?.textContent).toBe(
      'Stacked',
    );
  });

  it("selects the command's saved layout", async () => {
    await openDialog(trio);
    expect(options()).toEqual(['main-left', 'main-top', 'columns', 'rows', 'tabs']);
    expect(selected()).toBe('main-top');
  });

  it('keeps the selection while it fits the number of terminals, or moves to the default', async () => {
    await openDialog(trio);
    removeTerminal(3);
    expect(options()).toEqual(['columns', 'rows', 'tabs']);
    expect(selected()).toBe('columns');
    choose('rows');
    addTerminal();
    expect(selected()).toBe('rows');
    choose('main-top');
    addTerminal();
    expect(options()).toEqual(['grid', 'main-left', 'columns', 'rows', 'tabs']);
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

describe('tab view in the saved command dialog', () => {
  it('comes after the layouts, and saves the view while keeping the layout', async () => {
    const { update } = await openDialog(trio);
    choose('tabs');
    expect(selected()).toBe('tabs');
    click('#save-command');
    await vi.waitFor(() =>
      expect(update).toHaveBeenLastCalledWith({ commands: [{ ...trio, view: 'tabs' }] }),
    );
  });

  it("selects a command's tab view, and a layout goes back to split", async () => {
    const { update } = await openDialog({ ...trio, view: 'tabs' });
    expect(selected()).toBe('tabs');
    choose('rows');
    expect(selected()).toBe('rows');
    click('#save-command');
    await vi.waitFor(() =>
      expect(update).toHaveBeenLastCalledWith({ commands: [{ ...trio, layout: 'rows' }] }),
    );
  });

  it('saves no view for 1 terminal', async () => {
    const { update } = await openDialog({ ...trio, view: 'tabs' });
    removeTerminal(3);
    removeTerminal(2);
    click('#save-command');
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    const { layout: _, ...rest } = trio;
    expect(update).toHaveBeenLastCalledWith({
      commands: [{ ...rest, terminals: [{ command: 'npm run api' }] }],
    });
  });
});

const titles = () =>
  [...container.querySelectorAll<HTMLInputElement>('.term-field-title')].map((i) => i.value);

// Type into a field the way React notices.
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = Object.getPrototypeOf(el) as object;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  act(() => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const clickOn = (el: Element | null | undefined) =>
  act(() => {
    (el as HTMLElement).click();
  });

async function save() {
  await act(async () => {
    container.querySelector<HTMLFormElement>('#command-form')?.requestSubmit();
  });
}

describe('the terminal titles in the saved command dialog', () => {
  it('shows a title field for each terminal of a command with more than one', async () => {
    await openDialog(shop);
    expect(titles()).toEqual(['API', 'Web', '']);
    const labels = [...container.querySelectorAll('.term-field-title')].map((i) =>
      i.getAttribute('aria-label'),
    );
    expect(labels).toEqual([
      'Title for terminal 1',
      'Title for terminal 2',
      'Title for terminal 3',
    ]);
  });

  it('has no title field for 1 terminal, and shows them once a terminal is added', async () => {
    await openDialog(null);
    expect(titles()).toEqual([]);
    clickOn(container.querySelector('#add-term-field'));
    expect(titles()).toEqual(['', '']);
  });

  it('saves the titles trimmed, and leaves out an empty one', async () => {
    const { update } = await openDialog(shop);
    const fields = container.querySelectorAll<HTMLInputElement>('.term-field-title');
    type(fields[1] as HTMLInputElement, '  Storefront  ');
    type(fields[2] as HTMLInputElement, '   ');
    await save();
    expect(update).toHaveBeenCalledWith({
      commands: [
        {
          ...shop,
          autoStart: false,
          terminals: [
            { command: 'npm run api', title: 'API' },
            { command: 'npm run web', title: 'Storefront' },
            { command: '' },
          ],
        },
      ],
    });
  });

  it('keeps a title with its command when another terminal is removed', async () => {
    const { update } = await openDialog(shop);
    clickOn(container.querySelectorAll('.term-field .icon-btn')[0]);
    expect(titles()).toEqual(['Web', '']);
    await save();
    const saved = update.mock.calls.at(-1)?.[0].commands?.[0];
    expect(saved?.terminals).toEqual([{ command: 'npm run web', title: 'Web' }, { command: '' }]);
  });

  it('drops every title when the command is saved with 1 terminal', async () => {
    const { update } = await openDialog(shop);
    clickOn(container.querySelectorAll('.term-field .icon-btn')[2]);
    clickOn(container.querySelectorAll('.term-field .icon-btn')[1]);
    expect(titles()).toEqual([]);
    await save();
    const saved = update.mock.calls.at(-1)?.[0].commands?.[0];
    expect(saved?.terminals).toEqual([{ command: 'npm run api' }]);
  });

  it('shows a title as text', async () => {
    const payload = '<img src=x onerror="window.__pwned = true">';
    const cmd = { ...shop, terminals: [{ command: 'a', title: payload }, { command: 'b' }] };
    await openDialog(cmd);
    expect(titles()[0]).toBe(payload);
    expect(container.querySelector('img:not(.dialog-logo)')).toBeNull();
    expect((window as { __pwned?: boolean }).__pwned).toBeUndefined();
  });
});
