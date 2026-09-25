import { useState, type KeyboardEvent } from 'react';
import { activate, closeOverlay, readyTabs, runAction } from './appStore';
import { cx } from './cx';
import { filterPalette, paletteItems, type PaletteItem } from './palette';
import { useAppState } from './useAppState';
import { useModal } from './useModal';

function run(item: PaletteItem): void {
  closeOverlay();
  if ('action' in item.run) runAction(item.run.action);
  else activate(item.run.tabId);
}

// Mounted on each opening, so the query and the selection start fresh.
function PaletteBody() {
  const platform = useAppState((s) => s.info.platform);
  const tabs = useAppState((s) => s.tabs);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const terminals = readyTabs(tabs).map((t) => ({
    id: t.id,
    name: t.name || t.panes[0]?.shellName || 'Terminal',
  }));
  const items = filterPalette(paletteItems(platform, terminals), query);
  const current = Math.min(selected, Math.max(items.length - 1, 0));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setSelected((current + step + items.length) % Math.max(items.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[current];
      if (item) run(item);
    }
  };

  return (
    <div className="palette-body">
      <input
        className="palette-input"
        id="palette-input"
        type="text"
        placeholder="Type an action or a terminal's name"
        aria-label="Search actions"
        autoFocus
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(0);
        }}
        onKeyDown={onKeyDown}
      />
      <ul className="palette-list" id="palette-list" role="listbox">
        {items.map((item, i) => (
          <li
            key={item.key}
            role="option"
            aria-selected={i === current}
            className={cx('palette-item', i === current && 'selected')}
            onMouseMove={() => setSelected(i)}
            onClick={() => run(item)}
          >
            <span className="palette-label">{item.label}</span>
            {item.keys && <kbd className="keys">{item.keys}</kbd>}
          </li>
        ))}
        {items.length === 0 && <li className="palette-empty">Nothing matches</li>}
      </ul>
    </div>
  );
}

// Every action by name, with its keys, and every running terminal.
export function CommandPalette() {
  const open = useAppState((s) => s.overlay === 'palette');
  const ref = useModal(open);
  return (
    <dialog
      ref={ref}
      className="dialog palette"
      id="command-palette"
      aria-label="Command palette"
      onCancel={(event) => {
        event.preventDefault();
        closeOverlay();
      }}
    >
      {open && <PaletteBody />}
    </dialog>
  );
}
