// A terminal with word wrap off. xterm always breaks a line at its last column, and the ANSI mode
// that stops it (DECAWM) drops the text past that column instead. So the terminal gets more
// columns than the pane shows, the shell prints each line whole, and the pane scrolls sideways.

// Each column holds 12 bytes a row, so 10,000 rows of scrollback at 300 columns take up to 36 MB.
// At the largest text size and twice the screen's scale, 300 columns are about 10,000 pixels, so
// the WebGL canvas stays under the 16,384 a GPU draws.
export const NO_WRAP_COLS = 300;

// The columns for a pane that fits `fitCols`. A pane wider than NO_WRAP_COLS keeps its own.
export function noWrapCols(fitCols: number): number {
  return Math.max(fitCols, NO_WRAP_COLS);
}

// The sideways scroll that shows the cursor with two columns to spare. That is the left edge
// whenever the cursor fits there, as at a prompt, and otherwise `scroll` if the cursor is already
// in view. `visible` is the width of the part of the terminal on screen.
export function scrollToCursor(
  scroll: number,
  cursorX: number,
  cellWidth: number,
  visible: number,
): number {
  const margin = 2 * cellWidth;
  const left = cursorX * cellWidth;
  if (left + cellWidth + margin <= visible) return 0;
  if (left - margin < scroll) return left - margin;
  if (left + cellWidth + margin > scroll + visible) return left + cellWidth + margin - visible;
  return scroll;
}

type Wheel = Pick<WheelEvent, 'deltaX' | 'deltaY' | 'deltaMode' | 'shiftKey'>;

// How far a wheel event scrolls sideways, in pixels: a sideways swipe, or the wheel with Shift
// where the system has not already turned it sideways, as macOS does.
export function sidewaysDelta({ deltaX, deltaY, deltaMode, shiftKey }: Wheel, cellWidth: number) {
  const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : shiftKey ? deltaY : 0;
  return deltaMode === 1 ? delta * cellWidth : delta;
}
