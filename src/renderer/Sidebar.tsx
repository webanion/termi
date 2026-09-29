import { openOverlay, toggleSidebar, zoomFromHeader } from './appStore';
import { CommandList } from './CommandList';
import { cx } from './cx';
import { SettingsIcon, SidebarIcon } from './Icons';
import { StatsFooter } from './StatsFooter';
import { TerminalList } from './TerminalList';
import { useAppState } from './useAppState';
import { shortcutLabel } from '@/shared/shortcuts';

export function Sidebar() {
  const platform = useAppState((s) => s.info.platform);
  const dropping = useAppState((s) => s.sidebarDrop);
  return (
    <aside className={cx('sidebar', dropping && 'dropping')} id="sidebar">
      <div className="sidebar-head drag" onDoubleClick={(event) => zoomFromHeader(event.target)}>
        <div className="spacer"></div>
        <button
          className="icon-btn no-drag"
          id="open-settings"
          title={`Settings (${shortcutLabel('open-settings', platform)})`}
          aria-label="Settings"
          onClick={() => openOverlay('settings')}
        >
          <SettingsIcon />
        </button>
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

      {/* Shows while files are dragged over the sidebar. A drop opens a terminal in each folder. */}
      <div className="drop-hint" id="sidebar-drop-hint" aria-hidden="true">
        Drop to open a terminal here
      </div>
    </aside>
  );
}
