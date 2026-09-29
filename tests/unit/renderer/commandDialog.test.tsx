// @vitest-environment jsdom
// The saved command dialog gives each terminal a title field once there are 2 or more, and
// saves a command with 1 terminal without titles.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SavedCommand } from '../../../src/shared/types';

vi.mock('../../../src/renderer/terminalRuntime', () => ({
  createRuntime: () => ({}),
  getRuntime: () => undefined,
  allRuntimes: () => [].values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

const trio: SavedCommand = {
  id: 'trio0001',
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
    this.setAttribute('open', '');
  };
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function openDialog(commands: SavedCommand[], editing: SavedCommand | null) {
  vi.resetModules();
  vi.spyOn(window.termi.settings, 'get').mockResolvedValue({
    commands,
    sidebarWidth: 232,
    sidebarHidden: false,
    fontSize: 13,
    guideSeen: true,
  });
  const update = vi.spyOn(window.termi.settings, 'update');
  const store = await import('../../../src/renderer/appStore');
  const { CommandDialog } = await import('../../../src/renderer/CommandDialog');
  await store.init();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<CommandDialog />));
  act(() => store.openCommandDialog(editing));
  return { update };
}

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

const click = (el: Element | null | undefined) =>
  act(() => {
    (el as HTMLElement).click();
  });

async function save() {
  await act(async () => {
    container.querySelector<HTMLFormElement>('#command-form')?.requestSubmit();
  });
}

describe('the saved command dialog', () => {
  it('shows a title field for each terminal of a command with more than one', async () => {
    await openDialog([trio], trio);
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
    await openDialog([], null);
    expect(titles()).toEqual([]);
    click(container.querySelector('#add-term-field'));
    expect(titles()).toEqual(['', '']);
  });

  it('saves the titles trimmed, and leaves out an empty one', async () => {
    const { update } = await openDialog([trio], trio);
    const fields = container.querySelectorAll<HTMLInputElement>('.term-field-title');
    type(fields[1] as HTMLInputElement, '  Storefront  ');
    type(fields[2] as HTMLInputElement, '   ');
    await save();
    expect(update).toHaveBeenCalledWith({
      commands: [
        {
          ...trio,
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
    const { update } = await openDialog([trio], trio);
    click(container.querySelectorAll('.term-field .icon-btn')[0]);
    expect(titles()).toEqual(['Web', '']);
    await save();
    const saved = update.mock.calls.at(-1)?.[0].commands?.[0];
    expect(saved?.terminals).toEqual([{ command: 'npm run web', title: 'Web' }, { command: '' }]);
  });

  it('drops every title when the command is saved with 1 terminal', async () => {
    const { update } = await openDialog([trio], trio);
    click(container.querySelectorAll('.term-field .icon-btn')[2]);
    click(container.querySelectorAll('.term-field .icon-btn')[1]);
    expect(titles()).toEqual([]);
    await save();
    const saved = update.mock.calls.at(-1)?.[0].commands?.[0];
    expect(saved?.terminals).toEqual([{ command: 'npm run api' }]);
  });

  it('shows a title as text', async () => {
    const payload = '<img src=x onerror="window.__pwned = true">';
    const cmd = { ...trio, terminals: [{ command: 'a', title: payload }, { command: 'b' }] };
    await openDialog([cmd], cmd);
    expect(titles()[0]).toBe(payload);
    expect(container.querySelector('img:not(.dialog-logo)')).toBeNull();
    expect((window as { __pwned?: boolean }).__pwned).toBeUndefined();
  });
});
