// The track math behind resizing the panes of a split tab.
import { describe, expect, it } from 'vitest';
import {
  equalTracks,
  evenLine,
  layoutGrid,
  linePercent,
  moveLine,
  trackLines,
  tracksFor,
  trackTemplate,
} from '../../../src/renderer/paneTracks';
import { LAYOUTS } from '../../../src/shared/layouts';

const grid = (count: number, id: string) => {
  const layout = LAYOUTS[count]?.find((l) => l.id === id);
  if (!layout) throw new Error(`No layout ${id} for ${count}`);
  return layoutGrid(layout.areas);
};

describe('the tracks of a layout', () => {
  it('starts every column and row equal', () => {
    expect(equalTracks(grid(4, 'main-left'))).toEqual({ columns: [1, 1], rows: [1, 1, 1] });
    expect(equalTracks(grid(3, 'columns'))).toEqual({ columns: [1, 1, 1], rows: [1] });
    expect(trackTemplate([1, 2.5])).toBe('minmax(0, 1fr) minmax(0, 2.5fr)');
  });

  it('keeps the sizes only while they fit the grid', () => {
    const sizes = { columns: [1.5, 0.5], rows: [1, 1] };
    expect(tracksFor(sizes, grid(4, 'grid'))).toBe(sizes);
    expect(tracksFor(sizes, grid(4, 'main-left'))).toEqual({ columns: [1, 1], rows: [1, 1, 1] });
    expect(tracksFor(null, grid(2, 'rows'))).toEqual({ columns: [1], rows: [1, 1] });
  });
});

describe('the lines between panes', () => {
  it('has one line for each place two panes meet, in every layout', () => {
    const counts: Record<string, number> = {
      '2 columns': 1,
      '2 rows': 1,
      '3 main-left': 2,
      '3 main-top': 2,
      '3 columns': 2,
      '3 rows': 2,
      '4 grid': 2,
      '4 main-left': 3,
      '4 columns': 3,
      '4 rows': 3,
    };
    for (const [count, layouts] of Object.entries(LAYOUTS)) {
      for (const layout of layouts) {
        const name = `${count} ${layout.id}`;
        expect(trackLines(layoutGrid(layout.areas)), name).toHaveLength(counts[name] ?? -1);
      }
    }
  });

  it('runs a line only where it has a pane on each side', () => {
    // Large on the left: the rows split only the right column.
    expect(trackLines(grid(3, 'main-left'))).toEqual([
      { axis: 'columns', index: 0, from: 0, to: 1 },
      { axis: 'rows', index: 0, from: 1, to: 1 },
    ]);
    // Large on top: the columns split only the bottom row.
    expect(trackLines(grid(3, 'main-top'))).toEqual([
      { axis: 'columns', index: 0, from: 1, to: 1 },
      { axis: 'rows', index: 0, from: 0, to: 1 },
    ]);
    expect(trackLines(grid(4, 'grid'))).toEqual([
      { axis: 'columns', index: 0, from: 0, to: 1 },
      { axis: 'rows', index: 0, from: 0, to: 1 },
    ]);
  });

  it('gives a line broken by a spanning pane one handle for each part', () => {
    expect(trackLines(layoutGrid(['a b', 'c c', 'd e']))).toEqual([
      { axis: 'columns', index: 0, from: 0, to: 0 },
      { axis: 'columns', index: 0, from: 2, to: 2 },
      { axis: 'rows', index: 0, from: 0, to: 1 },
      { axis: 'rows', index: 1, from: 0, to: 1 },
    ]);
  });
});

describe('moving a line', () => {
  it('trades space between the two tracks next to it, and leaves the others', () => {
    // Three columns of 300 pixels each: 100 pixels to the right makes 400 and 200.
    expect(moveLine([1, 1, 1], 0, 100, 900, 50)).toEqual([1.3333, 0.6667, 1]);
    expect(moveLine([1, 1, 1], 1, -150, 900, 50)).toEqual([1, 0.5, 1.5]);
  });

  it('works from sizes that are already uneven', () => {
    // 600 and 200 pixels: 100 pixels to the left makes 500 and 300.
    expect(moveLine([1.5, 0.5], 0, -100, 800, 50)).toEqual([1.25, 0.75]);
  });

  it('stops at the minimum size on either side', () => {
    expect(moveLine([1, 1], 0, 1000, 800, 160)).toEqual([1.6, 0.4]);
    expect(moveLine([1, 1], 0, -1000, 800, 160)).toEqual([0.4, 1.6]);
  });

  it('keeps two tracks equal when they are too small for two minimums', () => {
    expect(moveLine([1, 1], 0, 50, 200, 160)).toEqual([1, 1]);
  });

  it('leaves the sizes alone without a track after the line, or without space', () => {
    const sizes = [1, 1];
    expect(moveLine(sizes, 1, 50, 800, 160)).toBe(sizes);
    expect(moveLine(sizes, 0, 50, 0, 160)).toBe(sizes);
  });
});

describe('resetting a line', () => {
  it('makes the two tracks next to it equal, and leaves the others', () => {
    expect(evenLine([1.5, 0.5, 1], 0)).toEqual([1, 1, 1]);
    expect(evenLine([1.2, 0.3, 1.5], 1)).toEqual([1.2, 0.9, 0.9]);
    const sizes = [1, 1];
    expect(evenLine(sizes, 1)).toBe(sizes);
  });

  it('reads where the line sits between its tracks', () => {
    expect(linePercent([1, 1], 0)).toBe(50);
    expect(linePercent([1.5, 0.5], 0)).toBe(75);
    expect(linePercent([1, 1], 3)).toBe(50);
  });
});
