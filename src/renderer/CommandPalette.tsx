import { closedTerminals, readyTabs } from './appStore';
import { filterPalette, paletteItems } from './palette';
import { PaletteDialog, PaletteSearch } from './PaletteDialog';
import { useAppState } from './useAppState';

function PaletteBody() {
  const platform = useAppState((s) => s.info.platform);
  const tabs = useAppState((s) => s.tabs);
  const activeId = useAppState((s) => s.activeId);
  const commands = useAppState((s) => s.settings.commands);

  const terminals = readyTabs(tabs).map((t) => ({
    id: t.id,
    name: t.name || t.panes[0]?.shellName || 'Terminal',
  }));
  const active = tabs.find((t) => t.id === activeId && t.ready);
  const canReopen = Boolean(active && closedTerminals(active, commands).length);
  const hidden = canReopen ? [] : (['reopen-terminals'] as const);
  const items = paletteItems(platform, terminals, hidden);
  return (
    <PaletteSearch
      name="palette"
      placeholder="Type an action or a terminal's name"
      searchLabel="Search actions"
      results={(query) => filterPalette(items, query)}
    />
  );
}

// Every action by name, with its keys, and every running terminal.
export function CommandPalette() {
  const open = useAppState((s) => s.overlay === 'palette');
  return (
    <PaletteDialog open={open} id="command-palette" label="Command palette">
      <PaletteBody />
    </PaletteDialog>
  );
}
