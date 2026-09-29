// Files and folders dragged onto the window. One handler on the document takes every drag, so
// the page never opens a dropped file as a page, and a drop anywhere that takes none does
// nothing. A drop on a terminal types the paths into it. The quoting is a plain function, for
// tests.

export interface DroppedItem {
  path: string;
  folder: boolean;
}

// Where a drop lands: the terminal pane under the pointer, or nowhere that takes a drop.
export type DropZone = { kind: 'pane'; paneId: string } | null;

export interface DropHandlers {
  dropOnPane: (paneId: string, items: DroppedItem[]) => void;
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

// Only a drag that carries files or folders is a drop. Text dragged from another app is not.
export function carriesFiles(data: DataTransfer | null): boolean {
  return Boolean(data && Array.from(data.types).includes('Files'));
}

export function dropZone(target: EventTarget | null): DropZone {
  if (!(target instanceof Element)) return null;
  const pane = target.closest<HTMLElement>('.term-pane[data-pane-id]');
  if (pane?.dataset.paneId) return { kind: 'pane', paneId: pane.dataset.paneId };
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

  // Taking dragover everywhere is what stops the default, which opens a dropped file as a page.
  // Where no drop is taken, 'none' shows that and cancels the drop.
  document.addEventListener('dragover', (event) => {
    event.preventDefault();
    const zone = zoneFor(event);
    if (event.dataTransfer) event.dataTransfer.dropEffect = zone ? 'copy' : 'none';
  });

  document.addEventListener('drop', (event) => {
    event.preventDefault();
    const zone = zoneFor(event);
    if (!zone || !event.dataTransfer) return;
    const items = droppedItems(event.dataTransfer, pathForFile);
    if (items.length) handlers.dropOnPane(zone.paneId, items);
  });
}
