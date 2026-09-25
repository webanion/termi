import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dir: '',
  displays: [] as { workArea: { x: number; y: number; width: number; height: number } }[],
}));

vi.mock('electron', () => ({
  app: { getPath: () => mocks.dir },
  screen: { getAllDisplays: () => mocks.displays },
}));

const { loadWindowState } = await import('../../../src/main/windowState');

const mainDisplay = { workArea: { x: 0, y: 25, width: 1440, height: 875 } };
const save = (state: object) =>
  fs.writeFileSync(path.join(mocks.dir, 'window-state.json'), JSON.stringify(state));

beforeEach(() => {
  mocks.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'termi-window-'));
  mocks.displays = [mainDisplay];
});

afterEach(() => {
  fs.rmSync(mocks.dir, { recursive: true, force: true });
});

describe('loadWindowState', () => {
  it('uses the default size when nothing was saved', () => {
    expect(loadWindowState()).toEqual({ width: 1100, height: 700 });
  });

  it('reopens where the window was when that is on a display', () => {
    save({ x: 100, y: 120, width: 900, height: 600, isMaximized: true, isFullScreen: false });
    expect(loadWindowState()).toEqual({
      x: 100,
      y: 120,
      width: 900,
      height: 600,
      isMaximized: true,
      isFullScreen: false,
    });
  });

  it('keeps the size but lets the main display place a window whose display is gone', () => {
    save({ x: 3000, y: 200, width: 900, height: 600 });
    const state = loadWindowState();
    expect(state).toMatchObject({ width: 900, height: 600 });
    expect(state.x).toBeUndefined();
    expect(state.y).toBeUndefined();
  });

  it('needs at least 80 pixels of the window on a display to keep its place', () => {
    save({ x: 1440 - 79, y: 200, width: 900, height: 600 });
    expect(loadWindowState().x).toBeUndefined();
    save({ x: 1440 - 80, y: 200, width: 900, height: 600 });
    expect(loadWindowState().x).toBe(1440 - 80);
  });

  it('holds the minimum size', () => {
    save({ x: 0, y: 25, width: 100, height: 100 });
    expect(loadWindowState()).toMatchObject({ width: 480, height: 320 });
  });

  it('uses the defaults for a broken file', () => {
    fs.writeFileSync(path.join(mocks.dir, 'window-state.json'), 'garbage');
    expect(loadWindowState()).toEqual({ width: 1100, height: 700 });
  });
});
