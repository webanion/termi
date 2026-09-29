// The built MCP server, spawned over stdio the way an assistant runs it, against a temporary
// data folder.
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SETTINGS_VERSION } from '@/shared/settings';

const SERVER = path.join(__dirname, '..', '..', 'out', 'main', 'mcpServer.js');

interface Reply {
  id: number | string | null;
  result?: Record<string, unknown> & {
    content?: { text: string }[];
    isError?: boolean;
    structuredContent?: Record<string, unknown>;
  };
  error?: { code: number; message: string };
}

let dir: string;
let server: ChildProcessWithoutNullStreams;
let replies: Reply[];
let nextId = 1;

function start() {
  server = spawn(process.execPath, [SERVER], { env: { ...process.env, TERMI_USER_DATA: dir } });
  replies = [];
  let buffer = '';
  server.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      replies.push(JSON.parse(buffer.slice(0, newline)) as Reply);
      buffer = buffer.slice(newline + 1);
    }
  });
}

function sendLine(line: string) {
  server.stdin.write(`${line}\n`);
}

async function request(method: string, params?: object): Promise<Reply> {
  const id = nextId++;
  sendLine(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    const reply = replies.find((r) => r.id === id);
    if (reply) return reply;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`No reply to ${method}`);
}

const call = (name: string, args: object = {}) => request('tools/call', { name, arguments: args });
const settings = () => JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));

beforeEach(() => {
  if (!fs.existsSync(SERVER)) throw new Error(`${SERVER} is missing. Run npm run build first.`);
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'termi-mcp-'));
  start();
});

afterEach(() => {
  server.kill();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('MCP server', () => {
  it('agrees on a protocol version it knows, and falls back to its newest otherwise', async () => {
    const known = await request('initialize', { protocolVersion: '2025-06-18' });
    expect(known.result?.protocolVersion).toBe('2025-06-18');
    expect(known.result?.serverInfo).toMatchObject({ name: 'termi' });
    const unknown = await request('initialize', { protocolVersion: '1999-01-01' });
    expect(unknown.result?.protocolVersion).toBe('2025-11-25');
  });

  it('lists its four tools without leaking their handlers', async () => {
    const reply = await request('tools/list');
    const tools = reply.result?.tools as { name: string; run?: unknown }[];
    expect(tools.map((t) => t.name)).toEqual([
      'list_saved_commands',
      'add_saved_command',
      'edit_saved_command',
      'get_termi_docs',
    ]);
    expect(tools.some((t) => 'run' in t)).toBe(false);
  });

  it('adds, lists and edits saved commands in settings.json', async () => {
    const added = await call('add_saved_command', {
      name: 'Dev',
      terminals: ['npm run api', 'npm run web', ''],
      cwd: '~/code',
      layout: 'main-top',
    });
    expect(added.result?.isError).toBeUndefined();
    const id = (added.result?.structuredContent?.added as { id: string }).id;
    expect(settings().commands[0]).toMatchObject({ id, name: 'Dev', layout: 'main-top' });
    expect(settings().version).toBe(SETTINGS_VERSION);

    const listed = await call('list_saved_commands');
    expect(listed.result?.structuredContent?.commands).toEqual([
      {
        id,
        name: 'Dev',
        terminals: ['npm run api', 'npm run web', ''],
        cwd: '~/code',
        autoStart: false,
        layout: 'main-top',
      },
    ]);

    const byName = await call('edit_saved_command', { target: 'dev', autoStart: true });
    expect(byName.result?.isError).toBeUndefined();
    const byId = await call('edit_saved_command', { target: id, name: 'Dev renamed' });
    expect(byId.result?.isError).toBeUndefined();
    expect(settings().commands[0]).toMatchObject({ name: 'Dev renamed', autoStart: true });
  });

  it('drops a layout that no longer fits when the number of terminals changes', async () => {
    await call('add_saved_command', {
      name: 'Grid',
      terminals: ['a', 'b', 'c', 'd'],
      layout: 'grid',
    });
    await call('edit_saved_command', { target: 'Grid', terminals: ['a', 'b'] });
    expect(settings().commands[0].layout).toBeUndefined();
  });

  describe('terminal titles', () => {
    const shop = {
      id: 'shop0001',
      name: 'Shop',
      terminals: [
        { command: 'npm run api', title: 'API' },
        { command: 'npm run web', title: 'Web' },
        { command: '', title: 'Shell' },
      ],
    };
    const writeShop = () =>
      fs.writeFileSync(
        path.join(dir, 'settings.json'),
        JSON.stringify({ version: SETTINGS_VERSION, commands: [shop] }),
      );
    const edit = async (terminals: string[]) => {
      const reply = await call('edit_saved_command', { target: 'Shop', terminals });
      expect(reply.result?.isError).toBeUndefined();
      return reply.result?.structuredContent?.updated;
    };

    it('lists the titles, and leaves them out when no terminal has one', async () => {
      writeShop();
      await call('add_saved_command', { name: 'Plain', terminals: ['ls', ''] });
      const listed = await call('list_saved_commands');
      expect(listed.result?.structuredContent?.commands).toEqual([
        {
          id: 'shop0001',
          name: 'Shop',
          terminals: ['npm run api', 'npm run web', ''],
          titles: ['API', 'Web', 'Shell'],
          cwd: '',
          autoStart: false,
        },
        expect.not.objectContaining({ titles: expect.anything() }),
      ]);
    });

    it('keeps every title through an edit that leaves the terminals alone', async () => {
      writeShop();
      await call('edit_saved_command', { target: 'Shop', name: 'Shop dev', autoStart: true });
      expect(settings().commands[0].terminals).toEqual(shop.terminals);
    });

    it('keeps the title of a terminal whose command stays in the same place', async () => {
      writeShop();
      const updated = await edit(['npm run api', 'npm run storefront', '', 'npm test']);
      expect(updated).toMatchObject({ titles: ['API', '', 'Shell', ''] });
      expect(settings().commands[0].terminals).toEqual([
        { command: 'npm run api', title: 'API' },
        { command: 'npm run storefront' },
        { command: '', title: 'Shell' },
        { command: 'npm test' },
      ]);
    });

    it('drops the titles of terminals that moved', async () => {
      writeShop();
      const updated = await edit(['npm run web', '']);
      expect(updated).not.toHaveProperty('titles');
      expect(settings().commands[0].terminals).toEqual([
        { command: 'npm run web' },
        { command: '' },
      ]);
    });

    it('drops every title when 1 terminal is left', async () => {
      writeShop();
      await edit(['npm run api']);
      expect(settings().commands[0].terminals).toEqual([{ command: 'npm run api' }]);
    });

    it('does not take a title, so it writes nothing when given one', async () => {
      writeShop();
      const before = fs.readFileSync(path.join(dir, 'settings.json'), 'utf8');
      const reply = await call('edit_saved_command', {
        target: 'Shop',
        terminals: [{ command: 'npm run api', title: 'Backend' }],
      });
      expect(reply.result?.isError).toBe(true);
      expect(reply.result?.content?.[0]?.text).toMatch(/must be a string/);
      expect(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8')).toBe(before);
    });

    it('leaves out a saved command whose title is not a string', async () => {
      fs.writeFileSync(
        path.join(dir, 'settings.json'),
        JSON.stringify({
          version: SETTINGS_VERSION,
          commands: [shop, { id: 'bad', name: 'Bad', terminals: [{ command: 'ls', title: 3 }] }],
        }),
      );
      const listed = await call('list_saved_commands');
      const commands = listed.result?.structuredContent?.commands as { id: string }[];
      expect(commands.map((c) => c.id)).toEqual(['shop0001']);
    });
  });

  it('refuses a name two commands share, asking for the id', async () => {
    await call('add_saved_command', { name: 'Same', terminals: ['a'] });
    await call('add_saved_command', { name: 'same', terminals: ['b'] });
    const reply = await call('edit_saved_command', { target: 'SAME', autoStart: true });
    expect(reply.result?.isError).toBe(true);
    expect(reply.result?.content?.[0]?.text).toMatch(/More than one saved command/);
  });

  it('returns a rule violation as a tool error and writes nothing', async () => {
    const cases = [
      { name: 'Empty', terminals: [''] },
      { name: 'Five', terminals: ['a', 'b', 'c', 'd', 'e'] },
      { name: '', terminals: ['a'] },
      { name: 'Wrong type', terminals: 'echo' },
      { name: 'Bad layout', terminals: ['a', 'b'], layout: 'grid' },
    ];
    for (const args of cases) {
      const reply = await call('add_saved_command', args);
      expect(reply.result?.isError, JSON.stringify(args)).toBe(true);
    }
    expect(fs.existsSync(path.join(dir, 'settings.json'))).toBe(false);
  });

  it('upgrades an old settings file it finds, keeping keys it does not know', async () => {
    fs.writeFileSync(
      path.join(dir, 'settings.json'),
      JSON.stringify({ commands: [{ id: 'old', name: 'Old', command: 'ls' }], future: 1 }),
    );
    const listed = await call('list_saved_commands');
    expect(listed.result?.structuredContent?.commands).toMatchObject([
      { id: 'old', terminals: ['ls'] },
    ]);
    await call('edit_saved_command', { target: 'old', autoStart: true });
    expect(settings()).toMatchObject({ version: SETTINGS_VERSION, future: 1 });
  });

  it('serves its guide as a resource and a tool', async () => {
    const resource = await request('resources/read', { uri: 'termi://docs' });
    const text = (resource.result?.contents as { text: string }[])[0]?.text ?? '';
    expect(text).toMatch(/^# Termi MCP server/);
    expect(text).toMatch(/## Tool reference/);
    expect(text).toContain(dir);
    const tool = await call('get_termi_docs');
    expect(tool.result?.content?.[0]?.text).toBe(text);
    const missing = await request('resources/read', { uri: 'termi://nope' });
    expect(missing.error?.code).toBe(-32002);
  });

  it('answers protocol errors, and never answers a notification', async () => {
    sendLine('{"jsonrpc":"2.0","method":"notifications/initialized"}');
    sendLine('this is not json');
    const unknown = await request('no/such/method');
    expect(unknown.error).toMatchObject({ code: -32601 });
    const tool = await call('no_such_tool');
    expect(tool.error).toMatchObject({ code: -32602 });
    // One parse error with no id, and nothing for the notification.
    expect(replies.filter((r) => r.id === null)).toEqual([
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
    ]);
    expect(replies).toHaveLength(3);
  });
});
