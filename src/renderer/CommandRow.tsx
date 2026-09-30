import {
  activate,
  closedTerminals,
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
import { MAX_TERMINALS } from '@/shared/savedCommands';
import type { SavedCommand } from '@/shared/types';

interface Props {
  cmd: SavedCommand;
  presence: Presence;
}

export function CommandRow({ cmd, presence }: Props) {
  const tabs = useAppState((s) => s.tabs);
  const activeId = useAppState((s) => s.activeId);
  const running = tabs.find((t) => t.commandId === cmd.id);
  // While some of its terminals are closed, the row says how many are open, as in 2 of 3.
  const total = Math.min(cmd.terminals.length, MAX_TERMINALS);
  const closed = running ? closedTerminals(running, [cmd]).length : 0;
  const count = closed ? `${total - closed} of ${total}` : '';

  return (
    <li
      className={cx(
        'item',
        running && running.id === activeId && 'active',
        presence === 'entering' && 'entering',
        presence === 'leaving' && 'leaving',
      )}
      title={`${commandSummary(cmd)}${cmd.cwd ? `\nin ${cmd.cwd}` : ''}`}
    >
      <span className="cmd-state">{running ? <span className="dot"></span> : <PlayIcon />}</span>
      {/* The row's button, which covers the whole row. A running command gets focus, even with
          terminals closed. A stopped one starts. */}
      <button
        className="item-name row-button"
        onClick={() => {
          const current = commandById(cmd.id);
          if (running) activate(running.id);
          else if (current) runCommand(current);
        }}
      >
        {cmd.name}
      </button>
      {count && (
        <span className="item-count" title={`${count} terminals open`}>
          {count}
        </span>
      )}
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
