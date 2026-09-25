// PtyManager with real shells through node-pty. The shell is /bin/sh, so the test does not
// depend on whoever runs it and their shell setup.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PtyManager } from '../../src/main/ptyManager';

interface Sent {
  channel: string;
  args: unknown[];
}

let sent: Sent[];
let ptys: PtyManager;
let dir: string;

const output = (id: number) =>
  sent
    .filter((s) => s.channel === 'pty:data' && s.args[0] === id)
    .map((s) => s.args[1])
    .join('');

async function until(check: () => boolean, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('Timed out waiting');
}

beforeEach(() => {
  vi.stubEnv('SHELL', '/bin/sh');
  // Each manager gets its own list. Ids restart at 1 per manager, and a shell the last test
  // stopped can still report its exit after this test began.
  const events: Sent[] = [];
  sent = events;
  ptys = new PtyManager((channel, ...args) => events.push({ channel, args }));
  dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'termi-pty-')));
});

afterEach(() => {
  ptys.killAll();
  vi.unstubAllEnvs();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('PtyManager', () => {
  it('starts a shell in the folder asked for', async () => {
    const { id, title } = ptys.create({ cwd: dir, command: 'pwd' }, 1);
    expect(title).toBe('sh');
    await until(() => output(id).includes(dir));
  });

  it('types a saved command once the shell has started, lines in order', async () => {
    // $((...)) is expanded by the shell, so these markers only appear in the output, never in
    // the echo of what was typed.
    const { id } = ptys.create({ command: 'echo first$((0+1))\necho second$((0+2))' }, 1);
    await until(() => output(id).includes('second2'));
    expect(output(id).indexOf('first1')).toBeLessThan(output(id).indexOf('second2'));
  });

  it('batches fast output instead of sending every chunk', async () => {
    const { id } = ptys.create({ command: 'seq 1 20000; echo done$((1+1))' }, 1);
    await until(() => output(id).includes('done2'), 15000);
    const messages = sent.filter((s) => s.channel === 'pty:data' && s.args[0] === id).length;
    expect(messages).toBeLessThan(200);
  });

  it('reports the exit of the shell', async () => {
    const { id } = ptys.create({}, 1);
    await until(() => output(id).length > 0);
    ptys.write(id, 'exit 3\r');
    await until(() => sent.some((s) => s.channel === 'pty:exit' && s.args[0] === id));
    expect(sent.find((s) => s.channel === 'pty:exit')?.args).toEqual([id, 3]);
  });

  it('counts a terminal as busy while a program runs, and idle again after', async () => {
    const { id } = ptys.create({}, 1);
    await until(() => output(id).length > 0);
    expect(ptys.busyCount()).toBe(0);
    ptys.write(id, 'sleep 30\r');
    await until(() => ptys.busyCount() === 1);
    expect(sent.some((s) => s.channel === 'pty:title' && s.args[1] === 'sleep')).toBe(true);
    ptys.write(id, '\x03');
    await until(() => ptys.busyCount() === 0);
  });

  it('stops the shells a page opened, and only those', async () => {
    const mine = ptys.create({}, 7);
    const other = ptys.create({}, 8);
    await until(() => output(mine.id).length > 0 && output(other.id).length > 0);
    ptys.killOwnedBy(7);
    await until(() => sent.some((s) => s.channel === 'pty:exit' && s.args[0] === mine.id));
    expect(sent.some((s) => s.channel === 'pty:exit' && s.args[0] === other.id)).toBe(false);
  });
});
