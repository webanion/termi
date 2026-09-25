// Tests for scripts/devAppArmor.mjs: the profile it writes, and when it calls sudo. Each case runs
// against a made-up Electron path, a restriction file and a profile folder in a temporary
// folder, and a stub sudo first on PATH that records its arguments and what tee was given.
//
// Run: npm run test:scripts
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { electronBinary, profileName, profileText, setup } from './devAppArmor.mjs';

const SCRIPT = fileURLToPath(new URL('./devAppArmor.mjs', import.meta.url));
const ELECTRON = '/home/user/termi/node_modules/electron/dist/electron';
const NAME = 'termi-dev-3275cf53';

function sandbox(t, { restrict = '1' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'termi-apparmor-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, 'bin');
  const profileDir = join(dir, 'apparmor.d');
  mkdirSync(bin);
  mkdirSync(profileDir);
  const calls = join(dir, 'sudo-calls');
  const teeInput = join(dir, 'tee-input');
  writeFileSync(
    join(bin, 'sudo'),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> '${calls}'\n[ "$1" = tee ] && cat > '${teeInput}'\nexit 0\n`,
  );
  chmodSync(join(bin, 'sudo'), 0o755);
  const path = process.env.PATH;
  process.env.PATH = `${bin}${delimiter}${path}`;
  t.after(() => {
    process.env.PATH = path;
  });
  const restrictFile = join(dir, 'apparmor_restrict_unprivileged_userns');
  if (restrict !== null) writeFileSync(restrictFile, `${restrict}\n`);
  const lines = [];
  return {
    target: join(profileDir, NAME),
    lines,
    options: { electron: ELECTRON, restrictFile, profileDir, log: (line) => lines.push(line) },
    sudoCalls: () => (existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : []),
    teeInput: () => readFileSync(teeInput, 'utf8'),
  };
}

test('names the profile after the first 8 hex of a sha256 of the binary path', () => {
  assert.equal(profileName(ELECTRON), NAME);
  assert.notEqual(profileName('/home/user/termi-2/node_modules/electron/dist/electron'), NAME);
});

test('writes the profile that lets that binary create user namespaces', () => {
  assert.equal(
    profileText(NAME, ELECTRON),
    [
      'abi <abi/4.0>,',
      'include <tunables/global>',
      '',
      `profile ${NAME} "${ELECTRON}" flags=(unconfined) {`,
      '  userns,',
      '}',
      '',
    ].join('\n'),
  );
});

test('keeps spaces in the path and escapes AppArmor pattern characters', () => {
  const text = profileText(NAME, '/home/user/My Code/termi [2]/electron');
  assert.ok(text.includes(`profile ${NAME} "/home/user/My Code/termi \\[2\\]/electron" flags=`));
});

test('reports without calling sudo, naming the binary and the profile file first', (t) => {
  const s = sandbox(t);
  assert.equal(setup([], s.options), 0);
  assert.deepEqual(s.sudoCalls(), []);
  assert.deepEqual(s.lines.slice(0, 2), [
    `Electron binary: ${ELECTRON}`,
    `Profile file:    ${s.target}`,
  ]);
  const out = s.lines.join('\n');
  assert.match(out, /restricted: .* is 1/);
  assert.match(out, /The profile is not installed/);
  assert.ok(out.includes(profileText(NAME, ELECTRON)));
  assert.ok(out.includes(`sudo apparmor_parser -r ${s.target}`));
  assert.ok(out.includes('npm run setup:apparmor -- --execute'));
  assert.equal(existsSync(s.target), false);
});

test('with --execute writes the profile with sudo tee, then loads it', (t) => {
  const s = sandbox(t);
  assert.equal(setup(['--execute'], s.options), 0);
  assert.deepEqual(s.sudoCalls(), [`tee ${s.target}`, `apparmor_parser -r ${s.target}`]);
  assert.equal(s.teeInput(), profileText(NAME, ELECTRON));
});

test('does nothing when the same profile is installed', (t) => {
  const s = sandbox(t);
  writeFileSync(s.target, profileText(NAME, ELECTRON));
  assert.equal(setup(['--execute'], s.options), 0);
  assert.deepEqual(s.sudoCalls(), []);
  assert.match(s.lines.join('\n'), /installed, with the same content/);
});

test('replaces a different profile at that path', (t) => {
  const s = sandbox(t);
  writeFileSync(s.target, 'profile old {}\n');
  assert.equal(setup([], s.options), 0);
  assert.deepEqual(s.sudoCalls(), []);
  assert.match(s.lines.join('\n'), /A different profile is installed/);
  assert.equal(setup(['--execute'], s.options), 0);
  assert.deepEqual(s.sudoCalls(), [`tee ${s.target}`, `apparmor_parser -r ${s.target}`]);
});

test('needs nothing where there is no restriction file, as on macOS', (t) => {
  const s = sandbox(t, { restrict: null });
  assert.equal(setup(['--execute'], s.options), 0);
  assert.deepEqual(s.sudoCalls(), []);
  assert.match(s.lines.join('\n'), /Nothing is needed/);
});

test('needs nothing when the restriction is off', (t) => {
  const s = sandbox(t, { restrict: '0' });
  assert.equal(setup(['--execute'], s.options), 0);
  assert.deepEqual(s.sudoCalls(), []);
  assert.match(s.lines.join('\n'), /not restricted: .* is 0/);
});

test('refuses an argument other than --execute', (t) => {
  const s = sandbox(t);
  t.mock.method(console, 'error', () => {});
  assert.equal(setup(['--apply'], s.options), 2);
  assert.deepEqual(s.sudoCalls(), []);
  assert.deepEqual(s.lines, []);
});

test('says how to get Electron when the binary is missing', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'termi-apparmor-repo-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const pkg = join(dir, 'node_modules', 'electron');
  mkdirSync(pkg, { recursive: true });
  writeFileSync(join(pkg, 'package.json'), '{"name":"electron","main":"index.js"}');
  writeFileSync(join(pkg, 'index.js'), '');
  assert.throws(() => electronBinary(dir), /node node_modules\/electron\/install\.js/);
  mkdirSync(join(pkg, 'dist'));
  writeFileSync(join(pkg, 'path.txt'), 'electron');
  writeFileSync(join(pkg, 'dist', 'electron'), '');
  assert.equal(electronBinary(dir), realpathSync(join(pkg, 'dist', 'electron')));
});

test('runs from the command line, and exits 2 on a wrong argument', () => {
  let status = 0;
  try {
    execFileSync(process.execPath, [SCRIPT, '--apply'], { stdio: 'pipe' });
  } catch (err) {
    status = err.status;
  }
  assert.equal(status, 2);
});
