import type { KeyboardEvent } from 'react';
import { getState, isBusy, paneName, removePane, selectPane, type TabState } from './appStore';
import { cx } from './cx';
import { CloseIcon } from './Icons';
import { moveTo } from './LayoutOptions';

export const paneTabId = (paneId: string) => `pane-tab-${paneId}`;
export const panePanelId = (paneId: string) => `pane-panel-${paneId}`;

const focusTab = (paneId: string) => document.getElementById(paneTabId(paneId))?.focus();

// The tab strip of a tab in tab view: one tab for each of its terminals, named as a pane head
// names it. A hidden terminal's dot lights up when it has new output. It follows the WAI-ARIA
// tabs pattern: the selected tab is the strip's one tab stop, Left, Right, Home and End move to
// another tab and show its terminal, Tab goes on into the terminal, and Delete closes one.
export function PaneTabs({ tab }: { tab: TabState }) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const pane = tab.panes[index];
    if (!pane) return;
    if (event.key === 'Delete') {
      event.preventDefault();
      removePane(pane.id);
      // removePane focuses the terminal on the next frame. The keyboard stays in the strip, on
      // the tab that is now shown, unless the strip is gone.
      requestAnimationFrame(() => {
        const next = getState().tabs.find((t) => t.id === tab.id)?.focusedPaneId;
        if (next) focusTab(next);
      });
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') return;
    const to = moveTo(event.key, index, tab.panes.length);
    const target = to === undefined ? undefined : tab.panes[to];
    if (!target) return;
    event.preventDefault();
    selectPane(target.id, false);
    focusTab(target.id);
  };

  return (
    <div className="pane-tabs" role="tablist" aria-label="Terminals">
      {tab.panes.map((pane, index) => {
        const name = paneName(pane);
        const busy = isBusy(pane);
        const proc = busy && pane.proc !== name ? pane.proc : '';
        const selected = pane.id === tab.focusedPaneId;
        // The dot and the program are beside the tab, so its name says them too.
        const label = [
          name || pane.shellName,
          proc && `running ${proc}`,
          pane.activity && 'new output',
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <div
            key={pane.id}
            className={cx('pane-tab', selected && 'on')}
            data-tab-pane={pane.id}
            title={pane.command || pane.shellName || name}
          >
            <span className={cx('dot', pane.activity ? 'activity' : busy && 'busy')}></span>
            <button
              id={paneTabId(pane.id)}
              className="pane-name row-button"
              role="tab"
              aria-selected={selected}
              aria-controls={panePanelId(pane.id)}
              aria-label={label || undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectPane(pane.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {name}
            </button>
            <span className="pane-proc">{proc}</span>
            {/* Out of the tab order: Delete on the tab closes it from the keyboard. */}
            <button
              className="icon-btn"
              title="Close this terminal"
              aria-label={`Close ${name || pane.shellName || 'terminal'}`}
              tabIndex={-1}
              onClick={() => removePane(pane.id)}
            >
              <CloseIcon />
            </button>
          </div>
        );
      })}
    </div>
  );
}
