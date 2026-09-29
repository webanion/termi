import type { SavedCommand } from '@/shared/types';

// One line for a command that may have many lines.
export function commandLabel(command: string): string {
  return command
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('; ');
}

// A saved command's terminal on one line, named like a pane head names it: a plain shell by the
// shell's name.
export function terminalLabel(command: string, shellName: string): string {
  return commandLabel(command) || shellName || 'Shell';
}

export function commandSummary(cmd: SavedCommand): string {
  return cmd.terminals.map((t) => commandLabel(t.command) || 'Plain shell').join('\n');
}
