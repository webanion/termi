#!/usr/bin/env node
// A Claude Code PostToolUse hook. After Claude writes or edits a file, it runs ESLint with --fix
// and then Prettier with --write on that one file, with the project's own config and binaries.
//
// Claude Code sends the tool call as JSON on stdin. ESLint only runs on the files `npm run lint`
// covers, because the config parses TypeScript against the tsconfig projects and other files are
// not in them. Prettier runs on every file it knows, and .prettierignore still applies. When
// ESLint finds a problem it cannot fix, or Prettier cannot parse the file, the hook tells Claude,
// so Claude fixes it in the same turn. Anything else, such as a file outside the repository or a
// missing node_modules, is skipped without a word.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = process.env.CLAUDE_PROJECT_DIR || fileURLToPath(new URL('../..', import.meta.url));
const BIN = join(REPO, 'node_modules', '.bin');

// Keep in step with the `lint` script in package.json.
function isLintTarget(file) {
  return (
    /^(src|tests)\/.+\.tsx?$/.test(file) ||
    file === 'electron.vite.config.ts' ||
    /^vitest[^/]*\.config\.ts$/.test(file)
  );
}

function run(tool, args) {
  const result = spawnSync(join(BIN, tool), args, { cwd: REPO, encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() };
}

function tellClaude(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (typeof filePath !== 'string' || filePath === '') process.exit(0);

const absolute = resolve(REPO, filePath);
const file = relative(REPO, absolute).split(sep).join('/');
if (file.startsWith('../') || isAbsolute(file) || !existsSync(absolute)) process.exit(0);
if (!existsSync(join(BIN, 'eslint')) || !existsSync(join(BIN, 'prettier'))) process.exit(0);

const problems = [];

if (isLintTarget(file)) {
  const eslint = run('eslint', ['--fix', '--no-warn-ignored', file]);
  // ESLint exits 1 when problems are left, and 2 when it could not run at all.
  if (eslint.status === 1) {
    problems.push(`ESLint found problems it could not fix:\n${eslint.output}`);
  } else if (eslint.status !== 0) {
    problems.push(`ESLint could not run:\n${eslint.output}`);
  }
}

const prettier = run('prettier', ['--write', '--ignore-unknown', '--log-level', 'warn', file]);
if (prettier.status !== 0) problems.push(`Prettier could not format the file:\n${prettier.output}`);

if (problems.length > 0) tellClaude(`${file}\n\n${problems.join('\n\n')}`);
