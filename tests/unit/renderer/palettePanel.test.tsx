// @vitest-environment jsdom
// The search field and list the command palette's panels share: typing filters, the arrows move
// the selection, and Enter runs what is selected and closes the panel.
import './stubTermi';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as store from '../../../src/renderer/appStore';
import { filterPalette, type PaletteItem } from '../../../src/renderer/palette';
import { PaletteSearch } from '../../../src/renderer/PaletteDialog';

vi.mock('../../../src/renderer/appStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/renderer/appStore')>()),
  activate: vi.fn(),
  closeOverlay: vi.fn(),
  runAction: vi.fn(),
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

let container: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <PaletteSearch
        name="test"
        placeholder="Type"
        searchLabel="Search"
        results={(query) => filterPalette(ITEMS, query)}
      />,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const input = () => container.querySelector<HTMLInputElement>('#test-input');
const labels = () => [...container.querySelectorAll('.palette-item')].map((li) => li.textContent);
const selected = () =>
  container.querySelector('.palette-item.selected .palette-label')?.textContent;

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
  it('lists every item, with the first selected', () => {
    expect(container.querySelector('#test-list')?.getAttribute('role')).toBe('listbox');
    expect(labels()).toEqual([
      'New TerminalCtrl+Shift+T',
      'Clear BufferCtrl+Shift+K',
      'Go to ShopAlt+1',
    ]);
    expect(selected()).toBe('New Terminal');
  });

  it('moves the selection with the arrows, and wraps around', () => {
    press('ArrowDown');
    expect(selected()).toBe('Clear Buffer');
    press('ArrowUp');
    press('ArrowUp');
    expect(selected()).toBe('Go to Shop');
  });

  it('filters as you type, and starts the selection over', () => {
    press('ArrowDown');
    type('shop');
    expect(labels()).toEqual(['Go to ShopAlt+1']);
    expect(selected()).toBe('Go to Shop');
    type('nothing like this');
    expect(labels()).toEqual([]);
    expect(container.querySelector('.palette-empty')?.textContent).toBe('Nothing matches');
  });

  it('closes the panel and runs the selected item on Enter', () => {
    press('ArrowDown');
    press('Enter');
    expect(store.closeOverlay).toHaveBeenCalledOnce();
    expect(store.runAction).toHaveBeenCalledWith('clear');
    type('shop');
    press('Enter');
    expect(store.activate).toHaveBeenCalledWith(3);
  });

  it('runs an item on a click', () => {
    act(() => container.querySelectorAll<HTMLElement>('.palette-item')[0]?.click());
    expect(store.runAction).toHaveBeenCalledWith('new-terminal');
  });

  it('does nothing on Enter when nothing matches', () => {
    type('nothing like this');
    press('Enter');
    expect(store.closeOverlay).not.toHaveBeenCalled();
  });
});
