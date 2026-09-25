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
