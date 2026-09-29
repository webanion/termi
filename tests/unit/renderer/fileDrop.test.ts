// @vitest-environment jsdom
// Files and folders dropped on the window: how their paths are quoted for the shell, and where
// the one drop handler sends a drop.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  carriesFiles,
  droppedItems,
  dropZone,
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
  const dropOnPane = vi.fn();

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
      <header id="head"></header>
      <div class="term-pane" data-pane-id="p7"><div class="pane-body"><span id="inside"></span></div></div>`;
    watchDrops({ dropOnPane }, pathForFile);
  });

  beforeEach(() => dropOnPane.mockClear());

  it('finds the pane under the pointer', () => {
    expect(dropZone(el('inside'))).toEqual({ kind: 'pane', paneId: 'p7' });
    expect(dropZone(el('head'))).toBeNull();
    expect(dropZone(document)).toBeNull();
  });

  it('takes a drag everywhere, so the page never opens a dropped file', () => {
    for (const target of [el('inside'), el('head'), document.body]) {
      expect(drag('dragover', target, transfer([])).defaultPrevented).toBe(true);
      expect(drag('drop', target, transfer([{ path: '/tmp/a' }])).defaultPrevented).toBe(true);
    }
  });

  it('shows a copy over a terminal, and no drop anywhere else or for text', () => {
    const over = (target: HTMLElement, data: DataTransfer) => {
      drag('dragover', target, data);
      return data.dropEffect;
    };
    expect(over(el('inside'), transfer([]))).toBe('copy');
    expect(over(el('head'), transfer([]))).toBe('none');
    expect(over(el('inside'), transfer([], ['text/plain']))).toBe('none');
  });

  it('sends a drop on a terminal to that pane', () => {
    drag('drop', el('inside'), transfer([{ path: '/tmp/a' }, { path: '/tmp/b', folder: true }]));
    expect(dropOnPane).toHaveBeenCalledWith('p7', [
      { path: '/tmp/a', folder: false },
      { path: '/tmp/b', folder: true },
    ]);
  });

  it('ignores a drop elsewhere, a text drop, and files that have no path', () => {
    drag('drop', el('head'), transfer([{ path: '/tmp/a' }]));
    drag('drop', el('inside'), transfer([{ path: 'text', kind: 'string' }], ['text/plain']));
    drag('drop', el('inside'), transfer([{ path: '' }]));
    expect(dropOnPane).not.toHaveBeenCalled();
  });
});
