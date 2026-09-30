// The arithmetic behind a terminal with word wrap off: how wide it gets, where the pane scrolls to
// keep the cursor in view, and which wheel events scroll it sideways.
import { describe, expect, it } from 'vitest';
import { NO_WRAP_COLS, noWrapCols, scrollToCursor, sidewaysDelta } from '@/renderer/wordWrap';

const wheel = (deltaX: number, deltaY: number, shiftKey = false, deltaMode = 0) => ({
  deltaX,
  deltaY,
  deltaMode,
  shiftKey,
});

describe('noWrapCols', () => {
  it('gives a pane the wide size, or its own when it is wider', () => {
    expect(noWrapCols(80)).toBe(NO_WRAP_COLS);
    expect(noWrapCols(NO_WRAP_COLS + 20)).toBe(NO_WRAP_COLS + 20);
  });
});

describe('scrollToCursor', () => {
  // Columns 10 pixels wide, and 400 pixels, 40 columns, on screen.
  const follow = (scroll: number, cursorX: number) => scrollToCursor(scroll, cursorX, 10, 400);

  it('goes back to the left edge when the cursor fits there, as at a prompt', () => {
    expect(follow(900, 20)).toBe(0);
    expect(follow(900, 37)).toBe(0);
  });

  it('keeps the scroll while the cursor is in view', () => {
    expect(follow(500, 60)).toBe(500);
  });

  it('scrolls right to show a cursor past the right edge, with two columns to spare', () => {
    expect(follow(0, 100)).toBe(1010 + 20 - 400);
  });

  it('scrolls left to show a cursor past the left edge, with two columns to spare', () => {
    expect(follow(1000, 60)).toBe(580);
  });
});

describe('sidewaysDelta', () => {
  it('scrolls sideways with a sideways swipe', () => {
    expect(sidewaysDelta(wheel(30, 4), 10)).toBe(30);
    expect(sidewaysDelta(wheel(-30, 4), 10)).toBe(-30);
  });

  it('leaves a vertical scroll alone, unless Shift is held', () => {
    expect(sidewaysDelta(wheel(2, 40), 10)).toBe(0);
    expect(sidewaysDelta(wheel(0, 40, true), 10)).toBe(40);
  });

  it('counts a scroll in lines as columns', () => {
    expect(sidewaysDelta(wheel(3, 0, false, 1), 10)).toBe(30);
  });
});
