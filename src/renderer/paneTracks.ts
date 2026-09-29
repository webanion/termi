// The sizes of a split tab's grid tracks, its columns and its rows, as fr values. Equal tracks
// are all 1. Moving the line between two tracks trades space between those two only, and every
// other track keeps its size, so the same math works for every layout in shared/layouts.ts.

export type Axis = 'columns' | 'rows';

export interface TrackSizes {
  columns: number[];
  rows: number[];
}

// A line between two tracks, in the places where it runs between two different panes. `index`
// is the track before the line. The line runs along the tracks `from` to `to` of the other axis.
export interface TrackLine {
  axis: Axis;
  index: number;
  from: number;
  to: number;
}

// The grid of a layout, one array of pane letters per row.
export function layoutGrid(areas: string[]): string[][] {
  return areas.map((row) => row.split(' '));
}

export function equalTracks(grid: string[][]): TrackSizes {
  return {
    columns: Array<number>(grid[0]?.length ?? 0).fill(1),
    rows: Array<number>(grid.length).fill(1),
  };
}

// The sizes a tab keeps, while they still fit its grid, and equal tracks otherwise.
export function tracksFor(sizes: TrackSizes | null, grid: string[][]): TrackSizes {
  const equal = equalTracks(grid);
  if (
    !sizes ||
    sizes.columns.length !== equal.columns.length ||
    sizes.rows.length !== equal.rows.length
  )
    return equal;
  return sizes;
}

export function trackTemplate(sizes: number[]): string {
  return sizes.map((fr) => `minmax(0, ${fr}fr)`).join(' ');
}

// Every line a pane can be resized from. A line inside a pane that spans two tracks, such as the
// large pane of "Large on the left", has no handle there, and a line broken by one gets one
// handle for each part.
export function trackLines(grid: string[][]): TrackLine[] {
  const lines: TrackLine[] = [];
  const add = (axis: Axis, index: number, splits: boolean[]) => {
    let from = -1;
    for (let i = 0; i <= splits.length; i++) {
      if (splits[i]) {
        if (from < 0) from = i;
      } else if (from >= 0) {
        lines.push({ axis, index, from, to: i - 1 });
        from = -1;
      }
    }
  };
  const columns = grid[0]?.length ?? 0;
  for (let c = 0; c < columns - 1; c++) {
    const splits = grid.map((row) => row[c] !== row[c + 1]);
    add('columns', c, splits);
  }
  for (let r = 0; r < grid.length - 1; r++) {
    const below = grid[r + 1] ?? [];
    const splits = (grid[r] ?? []).map((cell, c) => cell !== below[c]);
    add('rows', r, splits);
  }
  return lines;
}

const round = (value: number) => Math.round(value * 10000) / 10000;

// Move the line after track `index` by `delta` pixels. `space` is the pixels all the tracks
// share, without the gaps. Neither track gets smaller than `min` pixels, unless the two together
// have less than twice that, and then they stay equal.
export function moveLine(
  sizes: number[],
  index: number,
  delta: number,
  space: number,
  min: number,
): number[] {
  const a = sizes[index];
  const b = sizes[index + 1];
  const total = sizes.reduce((sum, fr) => sum + fr, 0);
  if (a === undefined || b === undefined || total <= 0 || space <= 0) return sizes;
  const pair = ((a + b) / total) * space;
  const least = Math.min(min, pair / 2);
  const before = Math.min(pair - least, Math.max(least, (a / total) * space + delta));
  const first = round(((a + b) * before) / pair);
  const next = [...sizes];
  next[index] = first;
  next[index + 1] = round(a + b - first);
  return next;
}

// A double-click on a line makes the two tracks on either side of it equal again.
export function evenLine(sizes: number[], index: number): number[] {
  const a = sizes[index];
  const b = sizes[index + 1];
  if (a === undefined || b === undefined) return sizes;
  const next = [...sizes];
  next[index] = next[index + 1] = round((a + b) / 2);
  return next;
}

// Where the line sits between its two tracks, from 0 to 100, for a screen reader.
export function linePercent(sizes: number[], index: number): number {
  const a = sizes[index] ?? 0;
  const b = sizes[index + 1] ?? 0;
  return a + b > 0 ? Math.round((a / (a + b)) * 100) : 50;
}
