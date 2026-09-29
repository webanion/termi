// @vitest-environment jsdom
// Files and folders dropped on the window: how their paths are quoted for the shell, and where
// the one drop handler sends a drop.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  carriesFiles,
  droppedItems,
  dropZone,
  folderToOpen,
  parentFolder,
  pasteText,
  quoteForShell,
  watchDrops,
} from '../../../src/renderer/fileDrop';

interface FakeItem {
  path: string;
  folder?: boolean;
  kind?: string;
}

// A stand-in for the DataTransfer of a drag. The test's pathForFile reads a file's name as its
// path, so a File named '' is one that is not on disk.
function transfer(items: FakeItem[], types = ['Files']) {
  return {
    types,
    dropEffect: 'none',
    items: items.map(({ path, folder = false, kind = 'file' }) => ({
      kind,
      getAsFile: () => (kind === 'file' ? new File([], path) : null),
      webkitGetAsEntry: () => ({ isDirectory: folder }),
    })),
  } as unknown as DataTransfer;
}

const pathForFile = (file: File) => file.name;

describe('quoting a dropped path for the shell', () => {
  it('wraps a path in single quotes', () => {
    expect(quoteForShell('/Users/me/shot.png')).toBe("'/Users/me/shot.png'");
    expect(quoteForShell('/tmp/a b/c.png')).toBe("'/tmp/a b/c.png'");
  });

  it('closes the quote around a single quote in the path', () => {
    expect(quoteForShell("/tmp/it's here")).toBe("'/tmp/it'\\''s here'");
    expect(quoteForShell("''")).toBe("''\\'''\\'''");
  });

  it('leaves what a shell would expand as it is, inside the quotes', () => {
    expect(quoteForShell('/tmp/$HOME `x` !1 *.png')).toBe("'/tmp/$HOME `x` !1 *.png'");
  });

  it('separates paths with a space, and adds one after, as Terminal.app does', () => {
    expect(pasteText(['/a'])).toBe("'/a' ");
    expect(pasteText(['/a', '/b c'])).toBe("'/a' '/b c' ");
    expect(pasteText([])).toBe('');
  });
});

describe('the folder a drop on the sidebar opens', () => {
  it('is the folder itself, or the folder a file is in', () => {
    expect(folderToOpen({ path: '/Users/me/project', folder: true })).toBe('/Users/me/project');
    expect(folderToOpen({ path: '/Users/me/project/a.txt', folder: false })).toBe(
      '/Users/me/project',
    );
  });

  it('finds the parent of any absolute path', () => {
    expect(parentFolder('/Users/me/a b/c.png')).toBe('/Users/me/a b');
    expect(parentFolder('/Users/me/project/')).toBe('/Users/me');
    expect(parentFolder('/notes.txt')).toBe('/');
    expect(parentFolder('/')).toBe('/');
  });
});

describe('reading a drop', () => {
  it('takes only a drag that carries files', () => {
    expect(carriesFiles(null)).toBe(false);
    expect(carriesFiles(transfer([], ['text/plain']))).toBe(false);
    expect(carriesFiles(transfer([], ['text/plain', 'Files']))).toBe(true);
  });

  it('keeps each file and folder with a path, and tells folders from files', () => {
    const data = transfer([
      { path: '/tmp/project', folder: true },
      { path: '/tmp/notes.txt' },
      { path: '' },
      { path: 'text', kind: 'string' },
    ]);
    expect(droppedItems(data, pathForFile)).toEqual([
      { path: '/tmp/project', folder: true },
      { path: '/tmp/notes.txt', folder: false },
    ]);
  });
});

describe('the drop handler', () => {
  const hoverSidebar = vi.fn();
  const dropOnPane = vi.fn();
  const dropOnSidebar = vi.fn();

  // A drag event as the browser sends it, on `target`.
  function drag(type: string, target: EventTarget, data: DataTransfer) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: data });
    target.dispatchEvent(event);
    return event;
  }

  const el = (id: string) => {
    const found = document.getElementById(id);
    if (!found) throw new Error(`Missing element: #${id}`);
    return found;
  };

  beforeAll(() => {
    document.body.innerHTML = `
      <aside class="sidebar"><ul id="commands"><li id="command"></li></ul></aside>
      <header id="head"></header>
      <div class="term-pane" data-pane-id="p7"><div class="pane-body"><span id="inside"></span></div></div>`;
    watchDrops({ hoverSidebar, dropOnPane, dropOnSidebar }, pathForFile);
  });

  beforeEach(() => vi.clearAllMocks());

  it('finds the pane under the pointer, or the sidebar', () => {
    expect(dropZone(el('inside'))).toEqual({ kind: 'pane', paneId: 'p7' });
    expect(dropZone(el('command'))).toEqual({ kind: 'sidebar' });
    expect(dropZone(el('head'))).toBeNull();
    expect(dropZone(document)).toBeNull();
  });

  it('takes a drag everywhere, so the page never opens a dropped file', () => {
    for (const target of [el('inside'), el('command'), el('head'), document.body]) {
      expect(drag('dragover', target, transfer([])).defaultPrevented).toBe(true);
      expect(drag('drop', target, transfer([{ path: '/tmp/a' }])).defaultPrevented).toBe(true);
    }
  });

  it('leaves a text drag to the browser, so text can still be dragged into a field', () => {
    for (const target of [el('inside'), el('command'), el('head')]) {
      const text = () => transfer([{ path: 'text', kind: 'string' }], ['text/plain']);
      expect(drag('dragover', target, text()).defaultPrevented).toBe(false);
      expect(drag('drop', target, text()).defaultPrevented).toBe(false);
    }
  });

  it('shows a copy over a terminal, and no drop anywhere else', () => {
    const over = (target: HTMLElement, data: DataTransfer) => {
      drag('dragover', target, data);
      return data.dropEffect;
    };
    expect(over(el('inside'), transfer([]))).toBe('copy');
    expect(over(el('command'), transfer([]))).toBe('copy');
    expect(over(el('head'), transfer([]))).toBe('none');
  });

  it('sends a drop on a terminal to that pane', () => {
    drag('drop', el('inside'), transfer([{ path: '/tmp/a' }, { path: '/tmp/b', folder: true }]));
    expect(dropOnPane).toHaveBeenCalledWith('p7', [
      { path: '/tmp/a', folder: false },
      { path: '/tmp/b', folder: true },
    ]);
  });

  it('sends a drop anywhere on the sidebar to the sidebar', () => {
    drag('drop', el('command'), transfer([{ path: '/tmp/project', folder: true }]));
    expect(dropOnSidebar).toHaveBeenCalledWith([{ path: '/tmp/project', folder: true }]);
    expect(dropOnPane).not.toHaveBeenCalled();
  });

  it('ignores a drop elsewhere, a text drop, and files that have no path', () => {
    drag('drop', el('head'), transfer([{ path: '/tmp/a' }]));
    drag('drop', el('inside'), transfer([{ path: 'text', kind: 'string' }], ['text/plain']));
    drag('drop', el('command'), transfer([{ path: 'text', kind: 'string' }], ['text/plain']));
    drag('drop', el('inside'), transfer([{ path: '' }]));
    expect(dropOnPane).not.toHaveBeenCalled();
    expect(dropOnSidebar).not.toHaveBeenCalled();
  });

  it('shows the sidebar takes files while they are over it, and only files', () => {
    const last = () => hoverSidebar.mock.lastCall?.[0];
    drag('dragenter', el('commands'), transfer([]));
    expect(last()).toBe(true);
    // Moving within the sidebar enters the next element before it leaves the last one.
    drag('dragenter', el('command'), transfer([]));
    drag('dragleave', el('commands'), transfer([]));
    expect(last()).toBe(true);
    drag('dragover', el('inside'), transfer([]));
    expect(last()).toBe(false);
    drag('dragover', el('command'), transfer([], ['text/plain']));
    expect(last()).toBe(false);
  });

  it('stops showing it when the drag leaves the window or drops', () => {
    const last = () => hoverSidebar.mock.lastCall?.[0];
    drag('dragenter', el('command'), transfer([]));
    expect(last()).toBe(true);
    drag('dragleave', el('command'), transfer([]));
    expect(last()).toBe(false);
    drag('dragenter', el('command'), transfer([]));
    drag('drop', el('command'), transfer([{ path: '' }]));
    expect(last()).toBe(false);
  });
});
