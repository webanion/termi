#!/usr/bin/env node
// MCP server for Termi's saved commands. It speaks JSON-RPC over stdio, one message per line,
// and reads and writes the same settings.json as the app. A running Termi watches that file,
// so changes show in the sidebar right away.
//
// Build it with `npm run build`, then run it with plain Node: `node out/main/mcpServer.js`.
// It has no runtime dependencies.

import os from 'os';
import path from 'path';
import readline from 'readline';
import { readJson, writeJson } from '../main/jsonFile';
import { version } from '../../package.json';
import guideText from './docs.md?raw';
import type { SavedCommand, StoredCommand } from '../shared/types';

const MAX_TERMINALS = 4;
// Layouts per terminal count. The first one is the default.
// Keep in step with LAYOUTS in src/renderer/app.ts.
const LAYOUTS: Record<number, { id: string; label: string }[]> = {
  2: [
    { id: 'columns', label: 'Side by side' },
    { id: 'rows', label: 'Stacked' },
  ],
  3: [
    { id: 'main-left', label: 'Large on the left' },
    { id: 'main-top', label: 'Large on top' },
    { id: 'columns', label: 'Side by side' },
    { id: 'rows', label: 'Stacked' },
  ],
  4: [
    { id: 'grid', label: 'Grid' },
    { id: 'main-left', label: 'Large on the left' },
    { id: 'columns', label: 'Side by side' },
    { id: 'rows', label: 'Stacked' },
  ],
};
const LAYOUT_IDS: Record<number, string[]> = Object.fromEntries(
  Object.entries(LAYOUTS).map(([count, list]) => [count, list.map((l) => l.id)]),
);
const DOCS_URI = 'termi://docs';
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

// ---------- Settings file ----------

// The same folder Electron uses for app.getPath('userData') with the app name "Termi".
function userDataDir(): string {
  if (process.env.TERMI_USER_DATA) return process.env.TERMI_USER_DATA;
  const home = os.homedir();
  if (process.platform === 'darwin')
    return path.join(home, 'Library', 'Application Support', 'Termi');
  if (process.platform === 'win32')
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Termi');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Termi');
}

const SETTINGS_FILE = path.join(userDataDir(), 'settings.json');

type SettingsFile = Record<string, unknown> & { commands: SavedCommand[] };

// A saved command used to have one `command`. Now it has a list of terminals.
function upgradeCommand(cmd: StoredCommand): SavedCommand {
  if (Array.isArray(cmd.terminals)) return cmd as SavedCommand;
  const { command = '', ...rest } = cmd;
  return { ...rest, terminals: [{ command }] };
}

function readSettings(): SettingsFile {
  const settings = readJson<Record<string, unknown>>(SETTINGS_FILE, {});
  const stored = Array.isArray(settings.commands) ? (settings.commands as StoredCommand[]) : [];
  return { ...settings, commands: stored.map(upgradeCommand) };
}

// ---------- Saved commands ----------

class ToolError extends Error {}

type ToolArgs = Record<string, unknown>;

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

// Check a saved command with the same rules as the dialog in the app.
function validate(cmd: SavedCommand): void {
  if (!cmd.name) throw new ToolError('The name must not be empty.');
  if (!cmd.terminals.length) throw new ToolError('A saved command needs at least 1 terminal.');
  if (cmd.terminals.length > MAX_TERMINALS)
    throw new ToolError(`A saved command can have at most ${MAX_TERMINALS} terminals.`);
  if (!cmd.terminals[0]?.command)
    throw new ToolError(
      'The first terminal needs a command. Later terminals can be empty (a plain shell).',
    );
  if (cmd.layout !== undefined) {
    const ids = LAYOUT_IDS[cmd.terminals.length];
    if (!ids)
      throw new ToolError('A layout only applies to a saved command with 2 to 4 terminals.');
    if (!ids.includes(cmd.layout))
      throw new ToolError(
        `For ${cmd.terminals.length} terminals, the layout must be one of: ${ids.join(', ')}.`,
      );
  }
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
  writeJson(SETTINGS_FILE, { ...settings, commands: [...settings.commands, cmd] });
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
  } else if (next.layout && !LAYOUT_IDS[next.terminals.length]?.includes(next.layout)) {
    // The terminal count changed and the old layout does not fit it.
    delete next.layout;
  }
  validate(next);
  const commands = settings.commands.map((c) => (c.id === current.id ? next : c));
  writeJson(SETTINGS_FILE, { ...settings, commands });
  return { updated: describe(next) };
}

// ---------- Tools ----------

interface SchemaProperty {
  type: string;
  description: string;
  minItems?: number;
  maxItems?: number;
  items?: { type: string };
}

interface Tool {
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
    Object.entries(LAYOUT_IDS)
      .map(([count, ids]) => `For ${count} terminals: ${ids.join(', ')}.`)
      .join(' ') +
    ' Leave it out to use the first (default) layout.',
};

const TOOLS: Tool[] = [
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
    run: () => docsText(),
  },
];

// ---------- Docs ----------

// The guide in docs.md, then a reference built from the code, so the reference is always current.
function docsText(): string {
  const guide = guideText.trimEnd();

  const layouts = Object.entries(LAYOUTS).flatMap(([count, list]) =>
    list.map(
      (l, index) => `| ${count} | \`${l.id}\` | ${l.label}${index === 0 ? ' (default)' : ''} |`,
    ),
  );

  const tools = TOOLS.map((tool) => {
    const { properties, required = [] } = tool.inputSchema;
    const params = Object.entries(properties).map(([name, schema]) => {
      const type = schema.type === 'array' ? `${schema.items?.type}[]` : schema.type;
      const need = required.includes(name) ? 'required' : 'optional';
      return `- \`${name}\` (${type}, ${need}): ${schema.description}`;
    });
    return [
      `### \`${tool.name}\``,
      '',
      tool.description,
      '',
      ...(params.length ? params : ['No parameters.']),
    ].join('\n');
  });

  return [
    guide,
    '',
    '## Layouts',
    '',
    '| Terminals | Id | Looks like |',
    '| --- | --- | --- |',
    ...layouts,
    '',
    '## Tool reference',
    '',
    tools.join('\n\n'),
    '',
    '## This install',
    '',
    `- Settings file: \`${SETTINGS_FILE}\``,
    `- Server: \`${__filename}\``,
    `- Version: ${version}`,
    '',
  ].join('\n');
}

const RESOURCES = [
  {
    uri: DOCS_URI,
    name: 'termi-docs',
    title: 'Termi MCP guide',
    description:
      'How the Termi MCP server works: saved commands, rules, layouts, live sync, setup, and tools.',
    mimeType: 'text/markdown',
  },
];

const INSTRUCTIONS =
  'Termi is the user\'s own terminal app. "Saved commands" are entries in its sidebar that open a tab ' +
  'with 1 to 4 terminals. When the user mentions Termi, or asks to list, add, change, rename, or set up ' +
  'a saved command, use these tools. Call list_saved_commands first when you need an id or want to check ' +
  'what exists. A running Termi picks up changes right away. If you are not sure how something works, ' +
  `call get_termi_docs or read the ${DOCS_URI} resource.`;

// ---------- JSON-RPC over stdio ----------

type RequestId = string | number;

interface Request {
  id?: RequestId | null;
  method?: string;
  params?: Record<string, unknown>;
}

type Reply = { result: unknown } | { error: { code: number; message: string } };

function send(message: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
}

function callTool(params: Request['params']): Reply {
  const tool = TOOLS.find((t) => t.name === params?.name);
  if (!tool) return { error: { code: -32602, message: `Unknown tool: ${params?.name}` } };
  try {
    const result = tool.run((params?.arguments as ToolArgs) || {});
    if (typeof result === 'string')
      return { result: { content: [{ type: 'text', text: result }] } };
    return {
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      },
    };
  } catch (error) {
    const text =
      error instanceof ToolError
        ? error.message
        : `Termi could not do that: ${(error as Error).message}`;
    return { result: { content: [{ type: 'text', text }], isError: true } };
  }
}

function readResource(params: Request['params']): Reply {
  const resource = RESOURCES.find((r) => r.uri === params?.uri);
  if (!resource) return { error: { code: -32002, message: `Resource not found: ${params?.uri}` } };
  try {
    return {
      result: { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: docsText() }] },
    };
  } catch (error) {
    return {
      error: { code: -32603, message: `Could not read the docs: ${(error as Error).message}` },
    };
  }
}

function handle(request: Request): Reply {
  switch (request.method) {
    case 'initialize': {
      const asked = request.params?.protocolVersion;
      return {
        result: {
          protocolVersion:
            typeof asked === 'string' && PROTOCOL_VERSIONS.includes(asked)
              ? asked
              : PROTOCOL_VERSIONS[0],
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'termi', title: 'Termi', version },
          instructions: INSTRUCTIONS,
        },
      };
    }
    case 'ping':
      return { result: {} };
    case 'tools/list':
      return { result: { tools: TOOLS.map(({ run, ...tool }) => tool) } };
    case 'tools/call':
      return callTool(request.params);
    case 'resources/list':
      return { result: { resources: RESOURCES } };
    case 'resources/templates/list':
      return { result: { resourceTemplates: [] } };
    case 'resources/read':
      return readResource(request.params);
    default:
      return { error: { code: -32601, message: `Method not found: ${request.method}` } };
  }
}

const input = readline.createInterface({ input: process.stdin });
input.on('line', (line) => {
  if (!line.trim()) return;
  let request: Request;
  try {
    request = JSON.parse(line) as Request;
  } catch {
    send({ id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  // A message without an id is a notification, so it gets no reply.
  if (request.id === undefined || request.id === null) return;
  send({ id: request.id, ...handle(request) });
});
input.on('close', () => process.exit(0));
