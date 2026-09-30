import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { reopenTerminals, type ClosedTerminal, type TabState } from './appStore';
import { terminalLabel } from './commandText';
import { cx } from './cx';
import { ReopenIcon } from './Icons';
import { useAppState } from './useAppState';
import { shortcutLabel } from '@/shared/shortcuts';

interface Props {
  tab: TabState | undefined;
  closed: ClosedTerminal[];
}

// Reopens the terminals of the tab's saved command that were closed. It shows while there are
// any, and opens a menu with each of them by its command, and Reopen all.
export function ReopenControl({ tab, closed }: Props) {
  const platform = useAppState((s) => s.info.platform);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const shown = Boolean(tab && closed.length);
  if (open && !shown) setOpen(false);
  const keys = shortcutLabel('reopen-terminals', platform);
  const shellName = tab?.panes.find((p) => p.shellName)?.shellName ?? '';

  // The title stays centered and clear of the control, which needs its width.
  useLayoutEffect(() => {
    const control = ref.current;
    control
      ?.closest<HTMLElement>('.main-head')
      ?.style.setProperty('--reopen-w', `${control.offsetWidth + 8}px`);
  }, []);

  useLayoutEffect(() => {
    if (open) menu.current?.querySelector('button')?.focus();
  }, [open]);

  // A press anywhere else closes the menu. The header is a drag region that sends no presses,
  // so focus moving away closes it too.
  useEffect(() => {
    if (!open) return;
    const onPress = (event: MouseEvent) => {
      if (!(event.target instanceof Node && ref.current?.contains(event.target))) setOpen(false);
    };
    document.addEventListener('mousedown', onPress, true);
    return () => document.removeEventListener('mousedown', onPress, true);
  }, [open]);

  const reopen = (terminal?: number) => {
    setOpen(false);
    if (tab) reopenTerminals(tab.id, terminal);
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menu.current?.querySelectorAll('button') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => {
      event.preventDefault();
      items[(to + items.length) % items.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(-1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      button.current?.focus();
    }
  };

  return (
    <div
      ref={ref}
      className={cx('reopen-control no-drag', shown && 'show')}
      id="reopen-control"
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node && ref.current?.contains(event.relatedTarget)))
          setOpen(false);
      }}
    >
      <button
        ref={button}
        className={cx('reopen-btn', open && 'on')}
        id="reopen-terminals"
        title={`Reopen closed terminals (${keys})`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'reopen-menu' : undefined}
        disabled={!shown}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        <ReopenIcon />
        Reopen
      </button>
      {open && (
        <div
          ref={menu}
          className="reopen-menu"
          id="reopen-menu"
          role="menu"
          aria-label="Closed terminals"
          tabIndex={-1}
          onKeyDown={onMenuKey}
        >
          {closed.map((c) => (
            <button
              key={c.terminal}
              className="reopen-item"
              role="menuitem"
              title={c.command || undefined}
              onClick={() => reopen(c.terminal)}
            >
              <span className="reopen-name">{terminalLabel(c.command, shellName)}</span>
            </button>
          ))}
          <div className="reopen-sep" role="separator" />
          <button className="reopen-item all" role="menuitem" onClick={() => reopen()}>
            <span className="reopen-name">Reopen all</span>
            <kbd className="keys">{keys}</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
