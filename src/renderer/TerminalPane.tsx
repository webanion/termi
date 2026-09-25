import { useLayoutEffect, useRef } from 'react';
import {
  focusIfCurrent,
  focusPane,
  isBusy,
  removePane,
  setSelecting,
  type PaneState,
  type TabState,
} from './appStore';
import { commandLabel } from './commandText';
import { cx } from './cx';
import { CloseIcon } from './Icons';
import { getRuntime } from './terminalRuntime';

interface Props {
  tab: TabState;
  pane: PaneState;
  area: string | undefined;
}

// A host for the pane's terminal, which lives in terminalRuntime.ts. The head only shows when
// the tab has more than one pane.
export function TerminalPane({ tab, pane, area }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const runtime = getRuntime(pane.id);
    const el = host.current;
    if (!runtime || !el) return;
    runtime.attach(el);
    focusIfCurrent(pane.id);
    return () => runtime.detach();
  }, [pane.id]);

  const split = tab.panes.length > 1;
  const name = commandLabel(pane.command) || pane.shellName;
  const busy = isBusy(pane);

  return (
    <div
      className={cx('term-pane', split && pane.id === tab.focusedPaneId && 'focused')}
      style={area ? { gridArea: area } : undefined}
      // Select to copy: the store copies the selection when the mouse press that started here ends.
      onMouseDown={() => setSelecting(pane.id)}
      onFocus={() => focusPane(pane.id)}
    >
      <div className="pane-head" onClick={() => getRuntime(pane.id)?.focus()}>
        <span className={`dot ${split && busy ? 'busy' : ''}`}></span>
        <span className="pane-name" title={split ? pane.command || name : undefined}>
          {split ? name : ''}
        </span>
        <span className="pane-proc">{split && busy && pane.proc !== name ? pane.proc : ''}</span>
        <button
          className="icon-btn"
          title="Close this terminal"
          onClick={(event) => {
            event.stopPropagation();
            removePane(pane.id);
          }}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="pane-body" ref={host}></div>
    </div>
  );
}
