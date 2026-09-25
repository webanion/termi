// The rules for a saved command, the same in the saved command dialog and the MCP server.

import { layoutIds } from './layouts';
import type { SavedCommand } from './types';

export const MAX_TERMINALS = 4;

// Return what is wrong with a saved command, or null when it follows the rules.
export function savedCommandError(cmd: SavedCommand): string | null {
  if (!cmd.name) return 'The name must not be empty.';
  if (!cmd.terminals.length) return 'A saved command needs at least 1 terminal.';
  if (cmd.terminals.length > MAX_TERMINALS)
    return `A saved command can have at most ${MAX_TERMINALS} terminals.`;
  if (!cmd.terminals[0]?.command)
    return 'The first terminal needs a command. Later terminals can be empty (a plain shell).';
  if (cmd.layout !== undefined) {
    const ids = layoutIds(cmd.terminals.length);
    if (!ids) return 'A layout only applies to a saved command with 2 to 4 terminals.';
    if (!ids.includes(cmd.layout))
      return `For ${cmd.terminals.length} terminals, the layout must be one of: ${ids.join(', ')}.`;
  }
  return null;
}

// True when the value has the shape of a saved command. It checks types only, not the rules
// above, so a command edited by hand into an unusual shape can still be saved back.
export function isSavedCommandShape(value: unknown): value is SavedCommand {
  if (!isRecord(value)) return false;
  const { id, name, terminals, cwd, autoStart, layout } = value;
  return (
    typeof id === 'string' &&
    typeof name === 'string' &&
    Array.isArray(terminals) &&
    terminals.every((t) => isRecord(t) && typeof t.command === 'string') &&
    (cwd === undefined || typeof cwd === 'string') &&
    (autoStart === undefined || typeof autoStart === 'boolean') &&
    (layout === undefined || typeof layout === 'string')
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
