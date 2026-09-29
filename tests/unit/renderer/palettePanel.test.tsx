// @vitest-environment jsdom
// The search field and list the command palette and the launcher share: typing filters, the
// arrows move the selection, and Enter runs what is selected and closes the panel.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as store from '@/renderer/appStore';
import { filterPalette, launcherItems, newCommandItem, type PaletteItem } from '@/renderer/palette';
import { PaletteSearch } from '@/renderer/PaletteDialog';
import type { SavedCommand } from '@/shared/types';

vi.mock('@/renderer/appStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/renderer/appStore')>()),
  activate: vi.fn(),
  closeOverlay: vi.fn(),
  runAction: vi.fn(),
  runCommand: vi.fn(),
  commandById: vi.fn(),
  runningFor: vi.fn(),
}));

const ITEMS: PaletteItem[] = [
  {
    key: 'new-terminal',
    label: 'New Terminal',
    keys: 'Ctrl+Shift+T',
    run: { action: 'new-terminal' },
  },
  { key: 'clear', label: 'Clear Buffer', keys: 'Ctrl+Shift+K', run: { action: 'clear' } },
  { key: 'tab-3', label: 'Go to Shop', keys: 'Alt+1', run: { tabId: 3 } },
];

const COMMANDS: SavedCommand[] = [
  { id: 'web', name: 'Web server', terminals: [{ command: 'npm run dev' }], cwd: '~/shop' },
  { id: 'api', name: 'API server', terminals: [{ command: 'npm start' }] },
];

let container: HTMLElement | undefined;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function render(items: PaletteItem[], note?: string) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <PaletteSearch
        name="test"
        placeholder="Type"
        searchLabel="Search"
        note={note}
        results={(query) => filterPalette(items, query)}
      />,
    ),
  );
}

afterEach(() => {
  act(() => root.unmount());
  container?.remove();
  vi.clearAllMocks();
});

const find = (selector: string) => container?.querySelector(selector);
const input = () => find('#test-input') as HTMLInputElement | null;
const rows = () => [...(container?.querySelectorAll('.palette-item') ?? [])];
const labels = () => rows().map((li) => li.querySelector('.palette-label')?.textContent);
const selected = () => find('.palette-item.selected .palette-label')?.textContent;

function type(text: string) {
  const field = input();
  if (!field) throw new Error('No search field');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setValue?.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function press(key: string) {
  act(() => {
    input()?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

describe('the palette search', () => {
  it('lists every item with its keys, and selects the first', () => {
    render(ITEMS);
    expect(find('#test-list')?.getAttribute('role')).toBe('listbox');
    expect(labels()).toEqual(['New Terminal', 'Clear Buffer', 'Go to Shop']);
    expect(rows().map((li) => li.querySelector('.keys')?.textContent)).toEqual([
      'Ctrl+Shift+T',
      'Ctrl+Shift+K',
      'Alt+1',
    ]);
    expect(selected()).toBe('New Terminal');
  });

  it('moves the selection with the arrows, and wraps around', () => {
    render(ITEMS);
    press('ArrowDown');
    expect(selected()).toBe('Clear Buffer');
    press('ArrowUp');
    press('ArrowUp');
    expect(selected()).toBe('Go to Shop');
  });

  it('filters as you type, and starts the selection over', () => {
    render(ITEMS);
    press('ArrowDown');
    type('shop');
    expect(labels()).toEqual(['Go to Shop']);
    expect(selected()).toBe('Go to Shop');
    type('nothing like this');
    expect(labels()).toEqual([]);
    expect(find('.palette-empty')?.textContent).toBe('Nothing matches');
  });

  it('closes the panel and runs the selected item on Enter', () => {
    render(ITEMS);
    press('ArrowDown');
    press('Enter');
    expect(store.closeOverlay).toHaveBeenCalledOnce();
    expect(store.runAction).toHaveBeenCalledWith('clear');
    type('shop');
    press('Enter');
    expect(store.activate).toHaveBeenCalledWith(3);
  });

  it('runs an item on a click', () => {
    render(ITEMS);
    act(() => (rows()[0] as HTMLElement).click());
    expect(store.runAction).toHaveBeenCalledWith('new-terminal');
  });

  it('does nothing on Enter when nothing matches', () => {
    render(ITEMS);
    type('nothing like this');
    press('Enter');
    expect(store.closeOverlay).not.toHaveBeenCalled();
  });
});

describe('the launcher', () => {
  it('shows each saved command with what it runs, dim after the name', () => {
    render(launcherItems(COMMANDS));
    expect(labels()).toEqual(['Web server', 'API server']);
    expect(rows().map((li) => li.querySelector('.palette-detail')?.textContent)).toEqual([
      'npm run dev',
      'npm start',
    ]);
    expect(find('.keys')).toBeNull();
  });

  it('filters by name', () => {
    render(launcherItems(COMMANDS));
    type('api');
    expect(labels()).toEqual(['API server']);
    type('npm');
    expect(labels()).toEqual([]);
  });

  it('starts a saved command that is not running', () => {
    vi.mocked(store.commandById).mockReturnValue(COMMANDS[1]);
    render(launcherItems(COMMANDS));
    press('ArrowDown');
    press('Enter');
    expect(store.closeOverlay).toHaveBeenCalledOnce();
    expect(store.commandById).toHaveBeenCalledWith('api');
    expect(store.runCommand).toHaveBeenCalledWith(COMMANDS[1]);
    expect(store.activate).not.toHaveBeenCalled();
  });

  it('goes to the tab of a saved command that is running', () => {
    vi.mocked(store.commandById).mockReturnValue(COMMANDS[0]);
    vi.mocked(store.runningFor).mockReturnValue({ id: 5 } as store.TabState);
    render(launcherItems(COMMANDS));
    press('Enter');
    expect(store.runningFor).toHaveBeenCalledWith('web');
    expect(store.activate).toHaveBeenCalledWith(5);
    expect(store.runCommand).not.toHaveBeenCalled();
  });

  it('says there is no saved command, and offers to save one', () => {
    render([newCommandItem('darwin')], 'No saved commands yet');
    expect(find('.palette-empty')?.textContent).toBe('No saved commands yet');
    expect(labels()).toEqual(['New Saved Command']);
    expect(find('.palette-item .keys')?.textContent).toBe('⇧⌘N');
    press('Enter');
    expect(store.runAction).toHaveBeenCalledWith('new-command');
  });
});
