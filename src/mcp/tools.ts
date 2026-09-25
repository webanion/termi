import { readSettings, SETTINGS_FILE, writeSettings } from './settingsFile';
import { docsText, DOCS_URI } from './docs';
import { layoutIds, LAYOUTS } from '../shared/layouts';
import { MAX_TERMINALS, savedCommandError } from '../shared/savedCommands';
import type { SavedCommand } from '../shared/types';

// An error the caller can fix, sent back as the tool's result instead of a protocol error.
export class ToolError extends Error {}

export type ToolArgs = Record<string, unknown>;

interface SchemaProperty {
  type: string;
  description: string;
  minItems?: number;
  maxItems?: number;
  items?: { type: string };
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, SchemaProperty>;
    required?: string[];
    additionalProperties: false;
  };
  annotations: Record<string, string | boolean>;
  run: (args: ToolArgs) => unknown;
}

// ---------- Saved commands ----------

// The same kind of id as uid() in src/renderer/app.ts.
function newId(taken: Set<string>): string {
  let id;
  do id = Math.random().toString(36).slice(2, 10);
  while (taken.has(id));
  return id;
}

// Find a saved command by id, or by name when no id matches.
function findCommand(commands: SavedCommand[], target: unknown): SavedCommand {
  const key = String(target ?? '').trim();
  if (!key) throw new ToolError('Give the id or the name of the saved command.');
  const byId = commands.find((c) => c.id === key);
  if (byId) return byId;
  const byName = commands.filter((c) => c.name.toLowerCase() === key.toLowerCase());
  if (byName.length === 1) return byName[0] as SavedCommand;
  if (byName.length > 1)
    throw new ToolError(`More than one saved command is named "${key}". Use its id instead.`);
  throw new ToolError(
    `No saved command has the id or name "${key}". Call list_saved_commands to see them.`,
  );
}

function validate(cmd: SavedCommand): void {
  const error = savedCommandError(cmd);
  if (error) throw new ToolError(error);
}

function cleanTerminals(value: unknown): { command: string }[] {
  if (!Array.isArray(value)) throw new ToolError('"terminals" must be a list of command strings.');
  return value.map((command: unknown) => {
    if (typeof command !== 'string')
      throw new ToolError('Each item in "terminals" must be a string.');
    return { command: command.trim() };
  });
}

function cleanString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ToolError(`"${field}" must be a string.`);
  return value.trim();
}

function describe(cmd: SavedCommand) {
  return {
    id: cmd.id,
    name: cmd.name,
    terminals: cmd.terminals.map((t) => t.command),
    cwd: cmd.cwd || '',
    autoStart: Boolean(cmd.autoStart),
    ...(cmd.layout ? { layout: cmd.layout } : {}),
  };
}

function listCommands() {
  const { commands } = readSettings();
  return { settingsFile: SETTINGS_FILE, commands: commands.map(describe) };
}

function addCommand(args: ToolArgs) {
  const settings = readSettings();
  const cmd: SavedCommand = {
    id: newId(new Set(settings.commands.map((c) => c.id))),
    name: cleanString(args.name ?? '', 'name'),
    terminals: cleanTerminals(args.terminals ?? []),
    cwd: args.cwd === undefined ? '' : cleanString(args.cwd, 'cwd'),
    autoStart: Boolean(args.autoStart),
  };
  if (args.layout !== undefined) cmd.layout = cleanString(args.layout, 'layout');
  validate(cmd);
  writeSettings({ ...settings, commands: [...settings.commands, cmd] });
  return { added: describe(cmd) };
}

function editCommand(args: ToolArgs) {
  const settings = readSettings();
  const current = findCommand(settings.commands, args.target);
  const next: SavedCommand = { ...current };
  if (args.name !== undefined) next.name = cleanString(args.name, 'name');
  if (args.terminals !== undefined) next.terminals = cleanTerminals(args.terminals);
  if (args.cwd !== undefined) next.cwd = cleanString(args.cwd, 'cwd');
  if (args.autoStart !== undefined) next.autoStart = Boolean(args.autoStart);
  if (args.layout !== undefined) {
    // An empty string clears the layout, so the app uses the default one.
    const layout = cleanString(args.layout, 'layout');
    if (layout) next.layout = layout;
    else delete next.layout;
  } else if (next.layout && !layoutIds(next.terminals.length)?.includes(next.layout)) {
    // The terminal count changed and the old layout does not fit it.
    delete next.layout;
  }
  validate(next);
  const commands = settings.commands.map((c) => (c.id === current.id ? next : c));
  writeSettings({ ...settings, commands });
  return { updated: describe(next) };
}

// ---------- Tools ----------

const terminalsSchema: SchemaProperty = {
  type: 'array',
  minItems: 1,
  maxItems: MAX_TERMINALS,
  items: { type: 'string' },
  description:
    'One shell command per terminal, 1 to 4 items. All terminals open in one tab. ' +
    'The first command must not be empty. An empty string for a later item opens a plain shell. ' +
    'A command can have more than one line.',
};
const layoutSchema: SchemaProperty = {
  type: 'string',
  description:
    'How a tab with more than one terminal is split. ' +
    Object.entries(LAYOUTS)
      .map(([count, list]) => `For ${count} terminals: ${list.map((l) => l.id).join(', ')}.`)
      .join(' ') +
    ' Leave it out to use the first (default) layout.',
};

export const TOOLS: Tool[] = [
  {
    name: 'list_saved_commands',
    description:
      'List the saved commands in the Termi terminal app, with their id, name, terminal commands, ' +
      'working folder (cwd), auto-start flag, and layout.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'List Termi saved commands', readOnlyHint: true },
    run: listCommands,
  },
  {
    name: 'add_saved_command',
    description:
      'Add a saved command to the Termi terminal app. It shows in the Termi sidebar. ' +
      'A saved command opens one tab with 1 to 4 terminals, each running its own command.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The name shown in the sidebar and on the tab.' },
        terminals: terminalsSchema,
        cwd: {
          type: 'string',
          description: 'The folder the terminals start in. Leave it out to use the home folder.',
        },
        autoStart: {
          type: 'boolean',
          description: 'Start this command when Termi opens. The default is false.',
        },
        layout: layoutSchema,
      },
      required: ['name', 'terminals'],
      additionalProperties: false,
    },
    annotations: {
      title: 'Add a Termi saved command',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    run: addCommand,
  },
  {
    name: 'edit_saved_command',
    description:
      'Change a saved command in the Termi terminal app. Only the fields you give change. ' +
      '"terminals" replaces the whole list of terminal commands.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'The id of the saved command, or its exact name (not case-sensitive).',
        },
        name: { type: 'string', description: 'A new name.' },
        terminals: terminalsSchema,
        cwd: {
          type: 'string',
          description: 'A new working folder. An empty string means the home folder.',
        },
        autoStart: { type: 'boolean', description: 'Start this command when Termi opens.' },
        layout: {
          ...layoutSchema,
          description: `${layoutSchema.description} An empty string resets it to the default.`,
        },
      },
      required: ['target'],
      additionalProperties: false,
    },
    annotations: {
      title: 'Edit a Termi saved command',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
    },
    run: editCommand,
  },
  {
    name: 'get_termi_docs',
    description:
      'Read the guide to this MCP server: what saved commands are, the rules, the layouts, how changes reach the ' +
      'running app, what the server cannot do, and how to set it up and test it. The same text is the ' +
      `${DOCS_URI} resource.`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'Read the Termi MCP guide', readOnlyHint: true },
    run: () => docsText(TOOLS),
  },
];
