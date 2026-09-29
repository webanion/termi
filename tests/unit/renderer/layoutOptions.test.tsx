// @vitest-environment jsdom
// The layouts to choose from, in the header and in the saved command dialog, work as a radio
// group: one tab stop, and the arrow keys select the layout before or after.
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { LayoutOptions } from '../../../src/renderer/LayoutOptions';
import { LAYOUTS } from '../../../src/shared/layouts';

let container: HTMLElement;
let root: Root;
const selections: string[] = [];

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function Picker({ labeled }: { labeled?: boolean }) {
  const [selected, setSelected] = useState('main-top');
  return (
    <LayoutOptions
      layouts={LAYOUTS[3] ?? []}
      selected={selected}
      labeled={labeled}
      onSelect={(id) => {
        selections.push(id);
        setSelected(id);
      }}
    />
  );
}

function render(labeled?: boolean) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Picker labeled={labeled} />));
}

const radios = () => [...container.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
const checked = () => radios().find((r) => r.getAttribute('aria-checked') === 'true');
const press = (key: string) =>
  act(() => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  selections.length = 0;
});

describe('LayoutOptions', () => {
  it('checks the selected layout, and gives only it a tab stop', () => {
    render();
    expect(container.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe(
      'Layout',
    );
    expect(radios().map((r) => r.dataset.layout)).toEqual([
      'main-left',
      'main-top',
      'columns',
      'rows',
    ]);
    expect(checked()?.dataset.layout).toBe('main-top');
    expect(radios().map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1]);
  });

  it('selects and focuses the next or previous layout with the arrow keys, wrapping around', () => {
    render();
    act(() => checked()?.focus());
    press('ArrowRight');
    expect(checked()?.dataset.layout).toBe('columns');
    expect(document.activeElement).toBe(checked());
    press('ArrowDown');
    press('ArrowDown');
    expect(checked()?.dataset.layout).toBe('main-left');
    press('ArrowUp');
    expect(checked()?.dataset.layout).toBe('rows');
    press('Home');
    expect(checked()?.dataset.layout).toBe('main-left');
    press('End');
    expect(checked()?.dataset.layout).toBe('rows');
    expect(document.activeElement).toBe(checked());
    press('a');
    expect(selections).toEqual(['columns', 'rows', 'main-left', 'rows', 'main-left', 'rows']);
  });

  it('selects a layout with a click', () => {
    render();
    act(() => radios()[3]?.click());
    expect(selections).toEqual(['rows']);
    expect(checked()?.dataset.layout).toBe('rows');
  });

  it('names each layout as a tooltip, or as text when labeled', () => {
    render();
    expect(radios()[0]?.title).toBe('Large on the left');
    expect(radios()[0]?.getAttribute('aria-label')).toBe('Large on the left');
    act(() => root.unmount());
    container.remove();
    render(true);
    expect(radios()[0]?.textContent).toBe('Large on the left');
    expect(radios()[0]?.hasAttribute('title')).toBe(false);
  });
});
