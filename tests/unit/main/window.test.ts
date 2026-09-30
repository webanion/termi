// What happens when the window's page fails to load. createWindow() hands its load's rejection to
// pageLoadFailed().
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ showErrorBox: vi.fn(), exit: vi.fn() }));

vi.mock('electron', () => ({
  app: { isPackaged: true, exit: mocks.exit },
  dialog: { showErrorBox: mocks.showErrorBox },
  BrowserWindow: class {},
  shell: { openExternal: () => Promise.resolve() },
}));
vi.mock('@/main/windowState', () => ({ loadWindowState: () => ({}), trackWindowState: () => {} }));

const { pageLoadFailed } = await import('@/main/window');

// A navigation error as Electron rejects with it: a message, and the Chromium error name in code.
const loadError = (code: string) =>
  Object.assign(new Error(`${code} (-3) loading 'file:///index.html'`), { code, errno: -3 });

beforeEach(() => {
  mocks.showErrorBox.mockClear();
  mocks.exit.mockClear();
});

describe('pageLoadFailed', () => {
  it('says why and exits with an error when the page cannot load', () => {
    pageLoadFailed(loadError('ERR_FILE_NOT_FOUND'));
    expect(mocks.showErrorBox).toHaveBeenCalledWith(
      'Termi could not open its window',
      "ERR_FILE_NOT_FOUND (-3) loading 'file:///index.html'",
    );
    expect(mocks.exit).toHaveBeenCalledWith(1);
  });

  // A reload from the menu before the first load finished replaces that load, which Electron
  // rejects with ERR_ABORTED. The page still loads.
  it('ignores a load that another load replaced', () => {
    pageLoadFailed(loadError('ERR_ABORTED'));
    expect(mocks.showErrorBox).not.toHaveBeenCalled();
    expect(mocks.exit).not.toHaveBeenCalled();
  });

  it('names a rejection that is not an Error', () => {
    pageLoadFailed('gone');
    expect(mocks.showErrorBox).toHaveBeenCalledWith('Termi could not open its window', 'gone');
    expect(mocks.exit).toHaveBeenCalledWith(1);
  });
});
