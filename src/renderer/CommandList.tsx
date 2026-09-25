import { openCommandDialog } from './appStore';
import { CommandRow } from './CommandRow';
import { BoltIcon, PlusIcon } from './Icons';
import { useAppState } from './useAppState';
import { usePresence } from './usePresence';
import { shortcutLabel } from '../shared/shortcuts';

export function CommandList() {
  const commands = useAppState((s) => s.settings.commands);
  const platform = useAppState((s) => s.info.platform);
  const rows = usePresence(commands, (cmd) => cmd.id);

  return (
    <section className="section">
      <div className="section-head">
        <span className="section-title">Saved commands</span>
        <button
          className="icon-btn small"
          id="add-command"
          title={`New saved command (${shortcutLabel('new-command', platform)})`}
          aria-label="New saved command"
          onClick={() => openCommandDialog()}
        >
          <PlusIcon />
        </button>
      </div>
      <ul className="list" id="command-list">
        {rows.map(({ key, item, presence }) => (
          <CommandRow key={key} cmd={item} presence={presence} />
        ))}
      </ul>
      <button
        className="commands-empty"
        id="commands-empty"
        hidden={commands.length > 0}
        onClick={() => openCommandDialog()}
      >
        Save a command you run often. Turn on <BoltIcon className="inline-bolt" /> to start it when
        Termi opens.
      </button>
    </section>
  );
}
