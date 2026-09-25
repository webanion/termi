import type { SavedCommand } from '../shared/types';

// One line for a command that may have many lines.
export function commandLabel(command: string): string {
  return command
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('; ');
}

export function commandSummary(cmd: SavedCommand): string {
  return cmd.terminals.map((t) => commandLabel(t.command) || 'Plain shell').join('\n');
}
