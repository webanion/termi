import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { activate, closeOverlay, runAction } from './appStore';
import { cx } from './cx';
import type { PaletteItem } from './palette';
import { useModal } from './useModal';

function run(item: PaletteItem): void {
  closeOverlay();
  if ('action' in item.run) runAction(item.run.action);
  else activate(item.run.tabId);
}

interface SearchProps {
  name: string; // the start of the field's and the list's ids
  placeholder: string;
  searchLabel: string;
  results: (query: string) => PaletteItem[];
}

// A search field over a list: the arrows move the selection, and Enter or a click runs it.
// Mounted on each opening, so the query and the selection start fresh.
export function PaletteSearch({ name, placeholder, searchLabel, results }: SearchProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const items = results(query);
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
        id={`${name}-input`}
        type="text"
        placeholder={placeholder}
        aria-label={searchLabel}
        autoFocus
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(0);
        }}
        onKeyDown={onKeyDown}
      />
      <ul className="palette-list" id={`${name}-list`} role="listbox">
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

interface DialogProps {
  open: boolean;
  id: string;
  label: string;
  children: ReactNode;
}

// The modal the palette's panels open in. Escape closes it, and its body mounts only while it
// is open.
export function PaletteDialog({ open, id, label, children }: DialogProps) {
  const ref = useModal(open);
  return (
    <dialog
      ref={ref}
      className="dialog palette"
      id={id}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        closeOverlay();
      }}
    >
      {open && children}
    </dialog>
  );
}
