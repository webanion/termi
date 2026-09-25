import {
  activate,
  closeTab,
  commandById,
  openCommandDialog,
  runCommand,
  toggleAutoStart,
} from './appStore';
import { commandSummary } from './commandText';
import { cx } from './cx';
import { BoltIcon, EditIcon, PlayIcon, StopIcon } from './Icons';
import { useAppState } from './useAppState';
import type { Presence } from './usePresence';
import type { SavedCommand } from '../shared/types';

interface Props {
  cmd: SavedCommand;
  presence: Presence;
}

export function CommandRow({ cmd, presence }: Props) {
  const tabs = useAppState((s) => s.tabs);
  const activeId = useAppState((s) => s.activeId);
  const running = tabs.find((t) => t.commandId === cmd.id);

  return (
    <li
      className={cx(
        'item',
        running && running.id === activeId && 'active',
        presence === 'entering' && 'entering',
        presence === 'leaving' && 'leaving',
      )}
      title={`${commandSummary(cmd)}${cmd.cwd ? `\nin ${cmd.cwd}` : ''}`}
      // A running command gets focus. A stopped one starts.
      onClick={() => {
        const current = commandById(cmd.id);
        if (running) activate(running.id);
        else if (current) runCommand(current);
      }}
    >
      <span className="cmd-state">{running ? <span className="dot"></span> : <PlayIcon />}</span>
      <span className="item-name">{cmd.name}</span>
      {/* One group, so every button has the same gap. */}
      <span className="item-actions">
        <button
          className="icon-btn"
          title="Stop and close"
          hidden={!running}
          onClick={(event) => {
            event.stopPropagation();
            if (running) closeTab(running.id);
          }}
        >
          <StopIcon />
        </button>
        <button
          className="icon-btn"
          title="Edit"
          onClick={(event) => {
            event.stopPropagation();
            openCommandDialog(commandById(cmd.id) ?? null);
          }}
        >
          <EditIcon />
        </button>
        <button
          className={cx('icon-btn auto-btn', cmd.autoStart && 'on')}
          title={
            cmd.autoStart ? 'Starts when Termi opens. Click to turn off.' : 'Start when Termi opens'
          }
          onClick={(event) => {
            event.stopPropagation();
            const current = commandById(cmd.id);
            if (current) void toggleAutoStart(current);
          }}
        >
          <BoltIcon />
        </button>
      </span>
    </li>
  );
}
