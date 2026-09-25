import { toggleSidebar, zoomFromHeader } from './appStore';
import { CommandList } from './CommandList';
import { SidebarIcon } from './Icons';
import { StatsFooter } from './StatsFooter';
import { TerminalList } from './TerminalList';
import { useAppState } from './useAppState';
import { shortcutLabel } from '../shared/shortcuts';

export function Sidebar() {
  const platform = useAppState((s) => s.info.platform);
  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-head drag" onDoubleClick={(event) => zoomFromHeader(event.target)}>
        <div className="spacer"></div>
        <button
          className="icon-btn no-drag"
          id="hide-sidebar"
          title={`Hide sidebar (${shortcutLabel('toggle-sidebar', platform)})`}
          aria-label="Hide sidebar"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </button>
      </div>

      <div className="sidebar-scroll">
        <TerminalList />
        <CommandList />
      </div>

      <StatsFooter />
    </aside>
  );
}
