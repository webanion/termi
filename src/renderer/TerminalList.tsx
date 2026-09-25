import { useMemo } from 'react';
import { openTab, readyTabs } from './appStore';
import { PlusIcon } from './Icons';
import { TerminalRow } from './TerminalRow';
import { useAppState } from './useAppState';
import { usePresence } from './usePresence';
import { shortcutLabel } from '../shared/shortcuts';

export function TerminalList() {
  const tabs = useAppState((s) => s.tabs);
  const platform = useAppState((s) => s.info.platform);
  const ready = useMemo(() => readyTabs(tabs), [tabs]);
  const rows = usePresence(ready, (tab) => tab.id);

  return (
    <section className="section">
      <div className="section-head">
        <span className="section-title">Running</span>
        <span className="section-count" id="running-count">
          {ready.length}
        </span>
        <button
          className="icon-btn small"
          id="add-terminal"
          title={`New terminal (${shortcutLabel('new-terminal', platform)})`}
          aria-label="New terminal"
          onClick={() => openTab()}
        >
          <PlusIcon />
        </button>
      </div>
      <ul className="list" id="terminal-list">
        {rows.map(({ key, item, presence }) => (
          <TerminalRow key={key} tab={item} index={ready.indexOf(item)} presence={presence} />
        ))}
      </ul>
    </section>
  );
}
