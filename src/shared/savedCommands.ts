// The rules for a saved command, the same in the saved command dialog and the MCP server.

import { isPaneView, layoutIds, PANE_VIEWS } from './layouts';
import type { SavedCommand, SavedTerminal } from './types';

export const MAX_TERMINALS = 4;
export const MAX_TITLE = 60; // the same as the name field of the dialog

// Return what is wrong with a saved command, or null when it follows the rules.
export function savedCommandError(cmd: SavedCommand): string | null {
  if (!cmd.name) return 'The name must not be empty.';
  if (!cmd.terminals.length) return 'A saved command needs at least 1 terminal.';
  if (cmd.terminals.length > MAX_TERMINALS)
    return `A saved command can have at most ${MAX_TERMINALS} terminals.`;
  if (!cmd.terminals[0]?.command)
    return 'The first terminal needs a command. Later terminals can be empty (a plain shell).';
  const long = cmd.terminals.findIndex((t) => (t.title?.length ?? 0) > MAX_TITLE);
  if (long >= 0)
    return `The title of terminal ${long + 1} can have at most ${MAX_TITLE} characters.`;
  if (cmd.layout !== undefined) {
    const ids = layoutIds(cmd.terminals.length);
    if (!ids) return 'A layout only applies to a saved command with 2 to 4 terminals.';
    if (!ids.includes(cmd.layout))
      return `For ${cmd.terminals.length} terminals, the layout must be one of: ${ids.join(', ')}.`;
  }
  if (cmd.view !== undefined) {
    if (!isPaneView(cmd.view)) return `The view must be one of: ${PANE_VIEWS.join(', ')}.`;
    if (!layoutIds(cmd.terminals.length))
      return 'A view only applies to a saved command with 2 to 4 terminals.';
  }
  return null;
}

// True when the value has the shape of a saved command. It checks types only, not the rules
// above, so a command edited by hand into an unusual shape can still be saved back.
export function isSavedCommandShape(value: unknown): value is SavedCommand {
  if (!isRecord(value)) return false;
  const { id, name, terminals, cwd, autoStart, layout, view } = value;
  return (
    typeof id === 'string' &&
    typeof name === 'string' &&
    Array.isArray(terminals) &&
    terminals.every(
      (t) =>
        isRecord(t) &&
        typeof t.command === 'string' &&
        (t.title === undefined || typeof t.title === 'string'),
    ) &&
    (cwd === undefined || typeof cwd === 'string') &&
    (autoStart === undefined || typeof autoStart === 'boolean') &&
    (layout === undefined || typeof layout === 'string') &&
    (view === undefined || typeof view === 'string')
  );
}

// A terminal as it is saved, with its command and title trimmed. An empty title is no title.
export function savedTerminal(command: string, title = ''): SavedTerminal {
  const clean = title.trim();
  return clean ? { command: command.trim(), title: clean } : { command: command.trim() };
}

// The terminals after their list of commands was replaced. A terminal keeps its title while it
// runs the same command in the same place. A command with 1 terminal has no titles, since its
// name already says what it is.
export function keepTitles(before: SavedTerminal[], after: SavedTerminal[]): SavedTerminal[] {
  return after.map((t, i) => {
    const old = before[i];
    const same = after.length > 1 && old?.command === t.command;
    return savedTerminal(t.command, same ? old?.title : '');
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
