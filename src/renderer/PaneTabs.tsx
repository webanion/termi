import { isBusy, paneName, removePane, selectPane, type TabState } from './appStore';
import { cx } from './cx';
import { CloseIcon } from './Icons';

// The tab strip of a tab in tab view: one tab for each of its terminals, named as a pane head
// names it. A hidden terminal's dot lights up when it has new output.
export function PaneTabs({ tab }: { tab: TabState }) {
  return (
    <div className="pane-tabs" role="tablist" aria-label="Terminals">
      {tab.panes.map((pane) => {
        const name = paneName(pane);
        const busy = isBusy(pane);
        const selected = pane.id === tab.focusedPaneId;
        return (
          <div
            key={pane.id}
            className={cx('pane-tab', selected && 'on')}
            role="tab"
            aria-selected={selected}
            data-tab-pane={pane.id}
            title={pane.command || pane.shellName || name}
            onClick={() => selectPane(pane.id)}
          >
            <span className={cx('dot', pane.activity ? 'activity' : busy && 'busy')}></span>
            <span className="pane-name">{name}</span>
            <span className="pane-proc">{busy && pane.proc !== name ? pane.proc : ''}</span>
            <button
              className="icon-btn"
              title="Close this terminal"
              aria-label={`Close ${name}`}
              onClick={(event) => {
                event.stopPropagation();
                removePane(pane.id);
              }}
            >
              <CloseIcon />
            </button>
          </div>
        );
      })}
    </div>
  );
}
