import type { ReactElement } from 'react';
import type { Layout } from '../shared/layouts';

// Draw a layout as an icon: a frame, and a line wherever two panes meet.
export function LayoutIcon({ layout }: { layout: Layout }) {
  const grid = layout.areas.map((row) => row.split(' '));
  const rowCount = grid.length;
  const colCount = grid[0]?.length ?? 1;
  const x = (col: number) => +(4 + (16 * col) / colCount).toFixed(2);
  const y = (row: number) => +(5 + (14 * row) / rowCount).toFixed(2);
  const parts: ReactElement[] = [<rect key="frame" x="4" y="5" width="16" height="14" rx="2" />];
  for (const area of new Set(grid.flat())) {
    let top = rowCount;
    let bottom = 0;
    let left = colCount;
    let right = 0;
    grid.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell !== area) return;
        top = Math.min(top, r);
        bottom = Math.max(bottom, r + 1);
        left = Math.min(left, c);
        right = Math.max(right, c + 1);
      }),
    );
    if (right < colCount)
      parts.push(<path key={`v-${area}`} d={`M${x(right)} ${y(top)}V${y(bottom)}`} />);
    if (bottom < rowCount)
      parts.push(<path key={`h-${area}`} d={`M${x(left)} ${y(bottom)}H${x(right)}`} />);
  }
  return <svg viewBox="0 0 24 24">{parts}</svg>;
}
