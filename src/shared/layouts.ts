import type { PaneView } from './types';

// A tab with more than one terminal shows them all, split by a layout, or one at a time, as tabs.
// The layout stays chosen while tabs show, so switching back to split finds it again.
export const PANE_VIEWS: PaneView[] = ['split', 'tabs'];

export function isPaneView(value: unknown): value is PaneView {
  return PANE_VIEWS.includes(value as PaneView);
}

// How a tab with more than one terminal is split. Each string in `areas` is one grid row, and
// each letter is one terminal, in order. The first layout for each count is the default.

export interface Layout {
  id: string;
  label: string;
  areas: string[];
}

export const LAYOUTS: Record<number, Layout[]> = {
  2: [
    { id: 'columns', label: 'Side by side', areas: ['a b'] },
    { id: 'rows', label: 'Stacked', areas: ['a', 'b'] },
  ],
  3: [
    { id: 'main-left', label: 'Large on the left', areas: ['a b', 'a c'] },
    { id: 'main-top', label: 'Large on top', areas: ['a a', 'b c'] },
    { id: 'columns', label: 'Side by side', areas: ['a b c'] },
    { id: 'rows', label: 'Stacked', areas: ['a', 'b', 'c'] },
  ],
  4: [
    { id: 'grid', label: 'Grid', areas: ['a b', 'c d'] },
    { id: 'main-left', label: 'Large on the left', areas: ['a b', 'a c', 'a d'] },
    { id: 'columns', label: 'Side by side', areas: ['a b c d'] },
    { id: 'rows', label: 'Stacked', areas: ['a', 'b', 'c', 'd'] },
  ],
};

// The layout ids that fit a number of terminals, or undefined when that count has no layouts.
export function layoutIds(count: number): string[] | undefined {
  return LAYOUTS[count]?.map((layout) => layout.id);
}

// The layout with this id when it fits the number of terminals, or else the default for that
// number. Undefined when the number has no layouts.
export function fittingLayout(count: number, id: string | null | undefined): Layout | undefined {
  const options = LAYOUTS[count];
  return options?.find((layout) => layout.id === id) ?? options?.[0];
}
