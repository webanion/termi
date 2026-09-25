import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  activate,
  closeTab,
  focusActiveTab,
  focusedProc,
  isBusy,
  modKey,
  renameTab,
  type TabState,
} from './appStore';
import { commandSummary } from './commandText';
import { cx } from './cx';
import { CloseIcon } from './Icons';
import { useAppState } from './useAppState';
import type { Presence } from './usePresence';

interface Props {
  tab: TabState;
  index: number; // among the running tabs, or -1 once the row is leaving
  presence: Presence;
}

export function TerminalRow({ tab, index, presence }: Props) {
  const activeId = useAppState((s) => s.activeId);
  const info = useAppState((s) => s.info);
  const commands = useAppState((s) => s.settings.commands);
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');
  const nameRef = useRef<HTMLSpanElement>(null);
  const renameDone = useRef(false);
  // A leaving row keeps the shortcut it showed.
  const [shown, setShown] = useState(index);
  if (index >= 0 && index !== shown) setShown(index);

  const cmd = tab.commandId ? commands.find((c) => c.id === tab.commandId) : undefined;
  const meta = focusedProc(tab);
  const dot = tab.activity ? 'activity' : tab.panes.some(isBusy) ? 'busy' : '';

  // The name is edited in place. Its element is swapped for an editable one, so React never
  // rewrites text the user is typing.
  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!renaming || !el) return;
    el.focus();
    document.getSelection()?.selectAllChildren(el);
  }, [renaming]);

  const startRename = () => {
    setRenameText(tab.name);
    renameDone.current = false;
    setRenaming(true);
  };

  const finishRename = (commit: boolean) => {
    if (renameDone.current) return;
    renameDone.current = true;
    const value = (nameRef.current?.textContent ?? '').trim();
    if (commit && value) renameTab(tab.id, value);
    setRenaming(false);
    if (tab.id === activeId) focusActiveTab();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishRename(true);
    } else if (event.key === 'Escape') {
      finishRename(false);
    }
  };

  return (
    <li
      className={cx(
        'item',
        tab.id === activeId && 'active',
        presence === 'entering' && 'entering',
        presence === 'leaving' && 'leaving',
      )}
      title={cmd ? commandSummary(cmd) : tab.name}
      onClick={() => activate(tab.id)}
      onDoubleClick={() => {
        if (!renaming && presence !== 'leaving') startRename();
      }}
    >
      <span className={`dot ${dot}`}></span>
      {renaming ? (
        <span
          key="editing"
          ref={nameRef}
          className="item-name"
          contentEditable="true"
          suppressContentEditableWarning
          onKeyDown={onKeyDown}
          onBlur={() => finishRename(true)}
        >
          {renameText}
        </span>
      ) : (
        <span key="name" ref={nameRef} className="item-name">
          {tab.name}
        </span>
      )}
      <span className="item-meta" hidden={!meta}>
        {meta}
      </span>
      <span className="item-kbd" hidden={shown >= 9 || shown < 0}>
        {shown >= 0 && shown < 9 ? `${modKey(info)}${shown + 1}` : ''}
      </span>
      <span className="item-actions">
        <button
          className="icon-btn"
          title="Close terminal"
          onClick={(event) => {
            event.stopPropagation();
            closeTab(tab.id);
          }}
        >
          <CloseIcon />
        </button>
      </span>
    </li>
  );
}
