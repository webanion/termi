#!/usr/bin/env node
// An AppArmor profile for the development copy of Electron, so its sandbox starts when Termi runs
// from source on Ubuntu 23.10 and later. Those restrict unprivileged user namespaces through
// AppArmor, and without a profile `npm run dev` exits with "The SUID sandbox helper binary was
// found, but is not configured correctly".
//
//   npm run setup:apparmor                report what it would do, and change nothing
//   npm run setup:apparmor -- --execute   write the profile with sudo tee and load it
//
// It only reports unless given --execute. It names the Electron binary and the profile file first.
// The profile's name carries a hash of the binary's path, so each checkout with its own
// node_modules gets its own profile. On macOS, or on any system without the restriction, nothing
// is needed and it says so. The packaged app does not need this: its deb installs a profile.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RESTRICT_FILE = '/proc/sys/kernel/apparmor_restrict_unprivileged_userns';
export const PROFILE_DIR = '/etc/apparmor.d';
const REPO = fileURLToPath(new URL('..', import.meta.url));
const USAGE = 'usage: npm run setup:apparmor [-- --execute]';

export function profileName(electron) {
  return `termi-dev-${createHash('sha256').update(electron).digest('hex').slice(0, 8)}`;
}

// The path is quoted for spaces, and AppArmor's pattern characters are escaped, so the profile
// attaches to this one binary.
export function profileText(name, electron) {
  const attach = electron.replace(/[\\"*?[\]{}^]/g, '\\$&');
  return [
    'abi <abi/4.0>,',
    'include <tunables/global>',
    '',
    `profile ${name} "${attach}" flags=(unconfined) {`,
    '  userns,',
    '}',
    '',
  ].join('\n');
}

// The binary electron-vite starts, found as it finds it, through the electron package's
// path.txt. Requiring the package would download the binary when it is missing. AppArmor matches
// the real path, so symlinks are resolved.
export function electronBinary(repo = REPO) {
  let pkg;
  try {
    pkg = dirname(createRequire(join(repo, 'package.json')).resolve('electron'));
  } catch {
    throw new Error(`Electron is not installed in ${repo}: run npm ci first`);
  }
  const pathFile = join(pkg, 'path.txt');
  const binary = existsSync(pathFile) ? join(pkg, 'dist', readFileSync(pathFile, 'utf8')) : null;
  if (!binary || !existsSync(binary)) {
    throw new Error(
      "Electron's binary is not downloaded yet: run node node_modules/electron/install.js first",
    );
  }
  return realpathSync(binary);
}

function readIfThere(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export function setup(
  args,
  { electron, restrictFile = RESTRICT_FILE, profileDir = PROFILE_DIR, log = console.log } = {},
) {
  const unknown = args.filter((arg) => arg !== '--execute');
  if (unknown.length) {
    console.error(`unknown argument: ${unknown.join(' ')}\n${USAGE}`);
    return 2;
  }
  const execute = args.includes('--execute');
  const binary = electron ?? electronBinary();
  const name = profileName(binary);
  const target = join(profileDir, name);
  log(`Electron binary: ${binary}`);
  log(`Profile file:    ${target}`);
  log('');

  const restrict = readIfThere(restrictFile)?.trim() ?? null;
  if (restrict === null) {
    log(`There is no ${restrictFile}, so this system does not restrict`);
    log('user namespaces through AppArmor. Nothing is needed.');
    return 0;
  }
  if (restrict !== '1') {
    log(`Unprivileged user namespaces are not restricted: ${restrictFile} is ${restrict}.`);
    log("Electron's sandbox starts without a profile. Nothing is needed.");
    return 0;
  }
  log(`Unprivileged user namespaces are restricted: ${restrictFile} is 1.`);

  const text = profileText(name, binary);
  const installed = readIfThere(target);
  if (installed === text) {
    log('The profile is installed, with the same content. Nothing to do.');
    return 0;
  }
  log(
    installed === null
      ? 'The profile is not installed.'
      : 'A different profile is installed at that path. It would be replaced.',
  );

  if (!execute) {
    log('');
    log('It would write this profile:');
    log('');
    log(text);
    log('and load it with:');
    log('');
    log(`  sudo tee ${target} > /dev/null`);
    log(`  sudo apparmor_parser -r ${target}`);
    log('');
    log('To do that, run: npm run setup:apparmor -- --execute');
    return 0;
  }

  log(`Writing ${target} and loading it, with sudo.`);
  execFileSync('sudo', ['tee', target], { input: text, stdio: ['pipe', 'ignore', 'inherit'] });
  execFileSync('sudo', ['apparmor_parser', '-r', target], { stdio: 'inherit' });
  log(`Installed and loaded ${name}. npm run dev can start Electron's sandbox now.`);
  return 0;
}

// Compare real paths, so the check holds when the checkout sits behind a symlink, as /tmp does on macOS.
const script = process.argv[1];
if (script && existsSync(script) && realpathSync(script) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = setup(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
