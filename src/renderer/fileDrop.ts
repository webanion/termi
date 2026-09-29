// Files and folders dragged onto the window. One handler on the document takes every drag, so
// the page never opens a dropped file as a page, and a drop anywhere that takes none does
// nothing. A drop on a terminal types the paths into it, and a drop on the sidebar opens a
// terminal in each folder. The quoting and the folder rules are plain functions, for tests.

export interface DroppedItem {
  path: string;
  folder: boolean;
}

// A drop on the sidebar opens at most this many terminals.
export const MAX_DROPPED_TABS = 4;

// Where a drop lands: the terminal pane under the pointer, the sidebar, or nowhere that takes a
// drop.
export type DropZone = { kind: 'pane'; paneId: string } | { kind: 'sidebar' } | null;

export interface DropHandlers {
  hoverSidebar: (over: boolean) => void;
  dropOnPane: (paneId: string, items: DroppedItem[]) => void;
  dropOnSidebar: (items: DroppedItem[]) => void;
}

// Single quotes keep every character as it is, except a single quote, which ends the quote,
// adds an escaped quote and starts a new one.
export function quoteForShell(path: string): string {
  return `'${path.replaceAll("'", `'\\''`)}'`;
}

// What a drop on a terminal types, as Terminal.app does: each path quoted, a space between
// them, and one space after, so the next word can follow.
export function pasteText(paths: string[]): string {
  return paths.length ? `${paths.map(quoteForShell).join(' ')} ` : '';
}

// The folder a path is in. Dropped paths are absolute, with / between the parts.
export function parentFolder(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  const cut = trimmed.lastIndexOf('/');
  return cut > 0 ? trimmed.slice(0, cut) : '/';
}

// Where a terminal opened by a drop on the sidebar starts: in a dropped folder, or in the folder
// a dropped file is in.
export function folderToOpen(item: DroppedItem): string {
  return item.folder ? item.path : parentFolder(item.path);
}

// Only a drag that carries files or folders is a drop. Text dragged from another app is not.
export function carriesFiles(data: DataTransfer | null): boolean {
  return Boolean(data && Array.from(data.types).includes('Files'));
}

export function dropZone(target: EventTarget | null): DropZone {
  if (!(target instanceof Element)) return null;
  const pane = target.closest<HTMLElement>('.term-pane[data-pane-id]');
  if (pane?.dataset.paneId) return { kind: 'pane', paneId: pane.dataset.paneId };
  if (target.closest('.sidebar')) return { kind: 'sidebar' };
  return null;
}

// Read during the drop event, because the browser empties the DataTransfer after it. A File
// that is not on disk has no path and is left out.
export function droppedItems(
  data: DataTransfer,
  pathForFile: (file: File) => string,
): DroppedItem[] {
  const items: DroppedItem[] = [];
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    const path = file ? pathForFile(file) : '';
    if (path) items.push({ path, folder: Boolean(item.webkitGetAsEntry()?.isDirectory) });
  }
  return items;
}

export function watchDrops(handlers: DropHandlers, pathForFile: (file: File) => string): void {
  const zoneFor = (event: DragEvent) =>
    carriesFiles(event.dataTransfer) ? dropZone(event.target) : null;
  let entered: EventTarget | null = null;

  document.addEventListener('dragenter', (event) => {
    entered = event.target;
    handlers.hoverSidebar(zoneFor(event)?.kind === 'sidebar');
  });

  // The browser enters the next element before it leaves the last one. So leaving the element
  // entered last means the drag left the window.
  document.addEventListener('dragleave', (event) => {
    if (event.target !== entered) return;
    entered = null;
    handlers.hoverSidebar(false);
  });

  // Taking dragover everywhere is what stops the default, which opens a dropped file as a page.
  // Where no drop is taken, 'none' shows that and cancels the drop.
  document.addEventListener('dragover', (event) => {
    event.preventDefault();
    const zone = zoneFor(event);
    if (event.dataTransfer) event.dataTransfer.dropEffect = zone ? 'copy' : 'none';
    handlers.hoverSidebar(zone?.kind === 'sidebar');
  });

  document.addEventListener('drop', (event) => {
    event.preventDefault();
    entered = null;
    handlers.hoverSidebar(false);
    const zone = zoneFor(event);
    if (!zone || !event.dataTransfer) return;
    const items = droppedItems(event.dataTransfer, pathForFile);
    if (!items.length) return;
    if (zone.kind === 'pane') handlers.dropOnPane(zone.paneId, items);
    else handlers.dropOnSidebar(items);
  });
}
