// @vitest-environment jsdom
// A double-click on the header zooms the window from the page only on macOS. Elsewhere the
// system does it on the drag region, and the page toggling as well would undo it.
import './stubTermi';
import { afterEach, describe, expect, it, vi } from 'vitest';

// init() opens the first terminal. The store only keeps its runtime, so no xterm is needed.
vi.mock('../../../src/renderer/terminalRuntime', () => ({
  createRuntime: () => ({}),
  getRuntime: () => undefined,
  allRuntimes: () => [].values(),
  routePtyData: () => undefined,
  runtimeForPty: () => undefined,
  forgetPtyData: () => {},
}));

// A fresh store, started on the given platform.
async function storeOn(platform: string) {
  vi.resetModules();
  vi.spyOn(window.termi, 'info').mockResolvedValue({ platform, version: '0.1.0', home: '/' });
  const store = await import('../../../src/renderer/appStore');
  await store.init();
  return store;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('zoomFromHeader', () => {
  it('toggles maximise on macOS, but not from a button', async () => {
    const toggle = vi.spyOn(window.termi.window, 'toggleMaximize');
    const { zoomFromHeader } = await storeOn('darwin');
    zoomFromHeader(document.createElement('button'));
    expect(toggle).not.toHaveBeenCalled();
    zoomFromHeader(document.createElement('header'));
    expect(toggle).toHaveBeenCalledOnce();
  });

  it('leaves the double-click to the system on Linux', async () => {
    const toggle = vi.spyOn(window.termi.window, 'toggleMaximize');
    const { zoomFromHeader } = await storeOn('linux');
    zoomFromHeader(document.createElement('header'));
    expect(toggle).not.toHaveBeenCalled();
  });
});
