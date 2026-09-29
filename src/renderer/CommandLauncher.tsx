import { filterPalette, launcherItems, newCommandItem } from './palette';
import { PaletteDialog, PaletteSearch } from './PaletteDialog';
import { useAppState } from './useAppState';

function LauncherBody() {
  const platform = useAppState((s) => s.info.platform);
  const commands = useAppState((s) => s.settings.commands);

  const items = launcherItems(commands);
  const empty = items.length === 0;
  return (
    <PaletteSearch
      name="launcher"
      placeholder="Type a saved command's name"
      searchLabel="Search saved commands"
      note={empty ? 'No saved commands yet' : undefined}
      results={(query) => (empty ? [newCommandItem(platform)] : filterPalette(items, query))}
    />
  );
}

// Every saved command by name, to start it or go to its tab from the keyboard.
export function CommandLauncher() {
  const open = useAppState((s) => s.overlay === 'launcher');
  return (
    <PaletteDialog open={open} id="command-launcher" label="Run a saved command">
      <LauncherBody />
    </PaletteDialog>
  );
}
