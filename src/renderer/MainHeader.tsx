import { useEffect } from 'react';
import logoMark from '../../assets/logo-mark.svg';
import { focusedProc, toggleSidebar, zoomFromHeader } from './appStore';
import { cx } from './cx';
import { SidebarIcon } from './Icons';
import { LayoutControl } from './LayoutControl';
import { useAppState } from './useAppState';
import { LAYOUTS } from '../shared/layouts';

export function MainHeader() {
  const tabs = useAppState((s) => s.tabs);
  const activeId = useAppState((s) => s.activeId);
  // The title follows the active tab once its shells are running.
  const found = tabs.find((t) => t.id === activeId);
  const tab = found?.ready ? found : undefined;
  const hasLayout = Boolean(tab && LAYOUTS[tab.panes.length]);
  const name = tab ? tab.name : 'Termi';

  useEffect(() => {
    document.title = tab ? `${tab.name} | Termi` : 'Termi';
  }, [tab]);

  return (
    <header
      className={cx('main-head drag', hasLayout && 'has-layout')}
      id="main-head"
      onDoubleClick={(event) => zoomFromHeader(event.target)}
    >
      <button
        className="icon-btn no-drag"
        id="show-sidebar"
        title="Show sidebar (⌘B)"
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
      {/* Shows when the tab has more than one terminal. */}
      <LayoutControl tab={tab} />
    </header>
  );
}
