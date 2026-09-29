import { useEffect } from 'react';
import logoMark from '../../assets/logo-mark.svg';
import { closedTerminals, focusedProc, splitTab, toggleSidebar, zoomFromHeader } from './appStore';
import { cx } from './cx';
import { SidebarIcon, SplitIcon } from './Icons';
import { LayoutControl } from './LayoutControl';
import { ReopenControl } from './ReopenControl';
import { useAppState } from './useAppState';
import { LAYOUTS } from '../shared/layouts';
import { MAX_TERMINALS } from '../shared/savedCommands';
import { shortcutLabel } from '../shared/shortcuts';

export function MainHeader() {
  const tabs = useAppState((s) => s.tabs);
  const activeId = useAppState((s) => s.activeId);
  const platform = useAppState((s) => s.info.platform);
  const commands = useAppState((s) => s.settings.commands);
  // The title follows the active tab once its shells are running.
  const found = tabs.find((t) => t.id === activeId);
  const tab = found?.ready ? found : undefined;
  const hasLayout = Boolean(tab && LAYOUTS[tab.panes.length]);
  const full = Boolean(tab && tab.panes.length >= MAX_TERMINALS);
  const closed = tab ? closedTerminals(tab, commands) : [];
  const splitKeys = shortcutLabel('split-terminal', platform);
  const name = tab ? tab.name : 'Termi';

  useEffect(() => {
    document.title = tab ? `${tab.name} | Termi` : 'Termi';
  }, [tab]);

  return (
    <header
      className={cx(
        'main-head drag',
        tab && 'has-split',
        hasLayout && 'has-layout',
        closed.length > 0 && 'has-reopen',
      )}
      id="main-head"
      onDoubleClick={(event) => zoomFromHeader(event.target)}
    >
      <button
        className="icon-btn no-drag"
        id="show-sidebar"
        title={`Show sidebar (${shortcutLabel('toggle-sidebar', platform)})`}
        aria-label="Show sidebar"
        onClick={toggleSidebar}
      >
        <SidebarIcon />
      </button>
      <div className="title">
        <img src={logoMark} alt="" className="title-logo" />
        <span className="title-text" id="title-text">
          {name}
        </span>
        <span className="title-sub" id="title-sub">
          {tab ? focusedProc(tab) : ''}
        </span>
      </div>
      {/* Shows when the tab's saved command has terminals that were closed. */}
      <ReopenControl tab={tab} closed={closed} />
      {/* Shows when the tab has more than one terminal. */}
      <LayoutControl tab={tab} />
      <button
        className={cx('icon-btn', tab && 'show')}
        id="split-terminal"
        title={
          full ? `A tab holds at most ${MAX_TERMINALS} terminals` : `Split terminal (${splitKeys})`
        }
        aria-label="Split terminal"
        disabled={!tab || full}
        onClick={() => {
          if (tab) splitTab(tab.id);
        }}
      >
        <SplitIcon />
      </button>
    </header>
  );
}
