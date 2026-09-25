// Tests for scripts/changelog.mjs: the pure parts directly, then the CLI end to end in throwaway
// git repositories laid out like Termi's, with pull requests merged by merge commits, releases as
// v<version> tags, and the v1.1.0 and v1.2.0 tags from before numbering restarted at 0.1.0.
//
// Run: npm run test:scripts
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  compareVersions,
  extractNotes,
  insertSection,
  lintSubjects,
  parseCommit,
  previousRelease,
  renderSection,
  suggestBump,
} from './changelog.mjs';

const SCRIPT = fileURLToPath(new URL('./changelog.mjs', import.meta.url));
const REPO = 'https://github.com/webanion/termi';
const HEADER = '# Changelog\n\nEvery release of Termi, newest first.\n';

test('parses type, scope, summary and breaking markers', () => {
  assert.deepEqual(
    parseCommit({ sha: 'a', subject: 'feat(mcp): add a tool to remove a command' }),
    {
      sha: 'a',
      subject: 'feat(mcp): add a tool to remove a command',
      type: 'feat',
      scope: 'mcp',
      summary: 'add a tool to remove a command',
      breaking: false,
    },
  );
  assert.equal(parseCommit({ sha: 'b', subject: 'refactor!: move the MCP server' }).breaking, true);
  assert.equal(
    parseCommit({ sha: 'c', subject: 'fix: x', body: 'BREAKING CHANGE: y' }).breaking,
    true,
  );
  assert.equal(parseCommit({ sha: 'd', subject: 'Initial commit' }).type, null);
});

test('lint names every subject that is not conventional, and lets release commits through', () => {
  assert.deepEqual(
    lintSubjects([
      'feat: a',
      'fix(main): b',
      'Initial commit',
      'feature: c',
      'fix:missing space',
      'chore: release v0.1.1',
      'chore: release version 1.2.0',
    ]),
    ['Initial commit', 'feature: c', 'fix:missing space'],
  );
});

test('suggests a minor for breaking changes below 1.0 and a patch for anything else', () => {
  const c = (subject, body) => ({ sha: 'x', subject, body });
  assert.equal(suggestBump([c('fix: a')], '0.1.0'), 'patch');
  assert.equal(suggestBump([c('feat: a')], '0.1.0'), 'patch');
  assert.equal(suggestBump([c('feat!: a')], '0.1.0'), 'minor');
  assert.equal(suggestBump([c('fix: a', 'BREAKING CHANGE: b')], '0.4.2'), 'minor');
  assert.equal(suggestBump([c('feat: a')], '1.2.0'), 'minor');
  assert.equal(suggestBump([c('fix: a')], '1.2.0'), 'patch');
  assert.equal(suggestBump([c('fix: a', 'BREAKING CHANGE: b')], '1.2.0'), 'major');
  assert.equal(suggestBump([c('chore: release v0.1.1')], '0.1.1'), null);
  assert.equal(suggestBump([], '0.1.0'), null);
});

test('compares versions by semver precedence', () => {
  const sorted = [
    'v1.2.0',
    '0.1.0',
    'v0.10.0',
    '0.2.0-rc.1',
    '0.2.0',
    '0.2.0-rc.10',
    '0.2.0-beta',
    '0.1.1',
  ];
  assert.deepEqual(sorted.sort(compareVersions), [
    '0.1.0',
    '0.1.1',
    '0.2.0-beta',
    '0.2.0-rc.1',
    '0.2.0-rc.10',
    '0.2.0',
    'v0.10.0',
    'v1.2.0',
  ]);
  assert.equal(compareVersions('v0.1.0', '0.1.0'), 0);
});

test('the previous release ignores tags that sort above the version', () => {
  const tags = ['v1.1.0', 'v1.2.0'];
  assert.equal(previousRelease(tags, '0.1.0'), null);
  assert.equal(previousRelease(tags, '0.1.0', { inclusive: true }), null);
  const later = [...tags, 'v0.1.0', 'v0.1.1', 'v0.2.0', 'vnext', 'v0.3'];
  assert.equal(previousRelease(later, '0.1.1'), 'v0.1.0');
  assert.equal(previousRelease(later, '0.1.1', { inclusive: true }), 'v0.1.1');
  assert.equal(previousRelease(later, '0.3.0'), 'v0.2.0');
  assert.equal(previousRelease(later, '1.2.0'), 'v1.1.0');
  assert.equal(previousRelease(later, '2.0.0'), 'v1.2.0');
});

test('renders breaking changes first, then groups in order, with commit and pull request links', () => {
  const section = renderSection({
    version: '0.1.1',
    previousTag: 'v0.1.0',
    date: '2026-09-25',
    prs: new Map([['bbbbbbbbbb', '14']]),
    commits: [
      { sha: 'aaaaaaaaaa', subject: 'feat(renderer): open a link with a click' },
      {
        sha: 'bbbbbbbbbb',
        subject: 'fix(mcp)!: rename edit_saved_command to update_saved_command',
      },
      { sha: 'cccccccccc', subject: 'docs: explain the layouts' },
      { sha: 'ffffffffff', subject: 'ci: run the checks on macOS' },
      { sha: 'dddddddddd', subject: 'Tidy things up' },
      { sha: 'eeeeeeeeee', subject: 'chore: release v0.1.1' },
    ],
  });
  assert.equal(
    section,
    [
      '## v0.1.1 (2026-09-25)',
      '',
      `[Compare with v0.1.0](${REPO}/compare/v0.1.0...v0.1.1)`,
      '',
      '### Breaking changes',
      '',
      `- **mcp:** rename edit_saved_command to update_saved_command ([bbbbbbb](${REPO}/commit/bbbbbbbbbb), [#14](${REPO}/pull/14))`,
      '',
      '### Features',
      '',
      `- **renderer:** open a link with a click ([aaaaaaa](${REPO}/commit/aaaaaaaaaa))`,
      '',
      '### Documentation',
      '',
      `- explain the layouts ([ccccccc](${REPO}/commit/cccccccccc))`,
      '',
      '### Build and CI',
      '',
      `- run the checks on macOS ([fffffff](${REPO}/commit/ffffffffff))`,
      '',
      '### Other',
      '',
      `- Tidy things up ([ddddddd](${REPO}/commit/dddddddddd))`,
      '',
    ].join('\n'),
  );
});

test('a first section has no compare link, and nothing to show says so', () => {
  const first = renderSection({
    version: '0.1.0',
    previousTag: null,
    date: 'd',
    commits: [{ sha: 'aaaaaaaaaa', subject: 'feat: add Termi terminal app' }],
  });
  assert.doesNotMatch(first, /Compare with/);
  assert.match(first, /^## v0\.1\.0 \(d\)\n\n### Features\n\n- add Termi terminal app/);
  const empty = renderSection({ version: '0.1.1', previousTag: 'v0.1.0', date: 'd', commits: [] });
  assert.match(empty, /No changes recorded\./);
});

test('a new section goes above the others, below the introduction, and notes read it back', () => {
  const first = insertSection(HEADER, '## v0.1.0 (2026-09-24)\n\nFirst release.\n');
  assert.equal(first, `${HEADER}\n## v0.1.0 (2026-09-24)\n\nFirst release.\n`);
  const next = insertSection(first, '## v0.1.1 (2026-09-25)\n\n### Fixes\n\n- a\n');
  assert.equal(
    next,
    `${HEADER}\n## v0.1.1 (2026-09-25)\n\n### Fixes\n\n- a\n\n## v0.1.0 (2026-09-24)\n\nFirst release.\n`,
  );
  assert.equal(extractNotes(next, '0.1.1'), '### Fixes\n\n- a\n');
  assert.equal(extractNotes(next, '0.1.0'), 'First release.\n');
  assert.equal(extractNotes(next, '0.0.9'), null);
  assert.equal(insertSection('', '## v0.1.0 (d)\n\nx\n'), '# Changelog\n\n## v0.1.0 (d)\n\nx\n');
});

// A throwaway repository with Termi's shape: hand-bumped 1.x releases, two of them tagged, then
// package.json at 0.1.0 and a CHANGELOG.md with no sections.
function scratchRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'termi-changelog-'));
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_MERGE_AUTOEDIT: 'no',
    GIT_AUTHOR_NAME: 't',
    GIT_AUTHOR_EMAIL: 't@t',
    GIT_COMMITTER_NAME: 't',
    GIT_COMMITTER_EMAIL: 't@t',
  };
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', env }).trim();
  let n = 0;
  const commit = (subject) => {
    writeFileSync(join(dir, `file${++n}.txt`), subject);
    git('add', '.');
    git('commit', '-q', '-m', subject);
    return git('rev-parse', 'HEAD');
  };
  const cli = (...args) => {
    try {
      const out = execFileSync('node', [SCRIPT, ...args], {
        cwd: dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      });
      return { code: 0, out };
    } catch (e) {
      return { code: e.status, out: `${e.stdout}${e.stderr}` };
    }
  };
  const setVersion = (version) =>
    writeFileSync(join(dir, 'package.json'), `{"name":"termi","version":"${version}"}\n`);

  git('init', '-q', '-b', 'main');
  setVersion('1.0.0');
  const initial = commit('Initial commit');
  commit('feat: add Termi terminal app');
  commit('chore: release version 1.0.0');
  commit('feat: add split terminals to saved commands');
  setVersion('1.1.0');
  commit('chore: release version 1.1.0');
  git('tag', '-a', 'v1.1.0', '-m', 'v1.1.0');
  commit('feat: add MCP server for saved commands');
  setVersion('1.2.0');
  commit('chore: release version 1.2.0');
  git('tag', 'v1.2.0');
  commit('refactor(main): convert the main process to TypeScript');
  setVersion('0.1.0');
  writeFileSync(join(dir, 'CHANGELOG.md'), HEADER);
  commit('chore(version): restart numbering at 0.1.0');
  return {
    dir,
    git,
    commit,
    cli,
    setVersion,
    initial,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test('the first 0.x section covers every commit from the start, with or without the 1.x tags', () => {
  const kept = scratchRepo();
  const deleted = scratchRepo();
  try {
    deleted.git('tag', '-d', 'v1.1.0', 'v1.2.0');
    assert.equal(kept.git('tag', '--list'), 'v1.1.0\nv1.2.0');
    assert.equal(deleted.git('tag', '--list'), '');

    const sections = [];
    for (const repo of [kept, deleted]) {
      assert.equal(repo.cli('suggest').out.trim(), 'patch');
      const written = repo.cli('write', '0.1.0');
      assert.equal(written.code, 0, written.out);
      sections.push(
        written.out.replace(/[0-9a-f]{40}/g, 'SHA').replace(/\[[0-9a-f]{7}\]/g, '[sha]'),
      );

      assert.match(written.out, /^## v0\.1\.0 \(\d{4}-\d{2}-\d{2}\)\n\n### Features\n/);
      assert.doesNotMatch(written.out, /Compare with/);
      for (const summary of [
        'add Termi terminal app',
        'add split terminals to saved commands',
        'add MCP server for saved commands',
        '**main:** convert the main process to TypeScript',
        '**version:** restart numbering at 0.1.0',
        'Initial commit',
      ]) {
        assert.ok(written.out.includes(`- ${summary} (`), `missing ${summary}`);
      }
      assert.ok(written.out.includes(`${REPO}/commit/${repo.initial}`));
      assert.doesNotMatch(written.out, /release version/);

      const file = readFileSync(join(repo.dir, 'CHANGELOG.md'), 'utf8');
      assert.equal(file, `${HEADER}\n${written.out.trimEnd()}\n`);
      assert.equal(repo.cli('write', '0.1.0').code, 1, 'a version is written once');
    }
    assert.equal(sections[0], sections[1]);
  } finally {
    kept.cleanup();
    deleted.cleanup();
  }
});

test('after v0.1.0, lint, suggest, write and notes work from that tag, past the 1.x tags', () => {
  const repo = scratchRepo();
  try {
    const { git, commit, cli, setVersion } = repo;
    assert.equal(cli('write', '0.1.0').code, 0);
    git('add', '.');
    git('commit', '-q', '-m', 'chore: release v0.1.0');
    git('tag', '-a', 'v0.1.0', '-m', 'v0.1.0');

    assert.equal(cli('suggest').out.trim(), 'none');
    const nothing = cli('write', '0.1.1');
    assert.equal(nothing.code, 1);
    assert.match(nothing.out, /nothing to release: no commits since v0\.1\.0/);

    git('checkout', '-q', '-b', 'gm/fix/idle-shells');
    commit('fix(main): count idle shells as idle on Linux');
    commit('Tweak');
    git('checkout', '-q', 'main');
    git(
      'merge',
      '-q',
      '--no-ff',
      'gm/fix/idle-shells',
      '-m',
      'Merge pull request #13 from JawadAhbab/gm/fix/idle-shells',
    );

    const lint = cli('lint', 'v0.1.0..HEAD');
    assert.equal(lint.code, 1);
    assert.match(lint.out, /not a conventional commit: Tweak/);
    assert.doesNotMatch(lint.out, /Merge pull request/);
    assert.equal(cli('lint', 'v0.1.0..HEAD^2~1').code, 0);
    assert.equal(cli('suggest').out.trim(), 'patch');

    const written = cli('write', 'v0.1.1');
    assert.equal(written.code, 0, written.out);
    assert.match(written.out, /^## v0\.1\.1 \(\d{4}-\d{2}-\d{2}\)\n\n/);
    assert.ok(written.out.includes(`[Compare with v0.1.0](${REPO}/compare/v0.1.0...v0.1.1)`));
    assert.match(
      written.out,
      /### Fixes\n\n- \*\*main:\*\* count idle shells as idle on Linux \(\[[0-9a-f]{7}\]\(https:\/\/github\.com\/webanion\/termi\/commit\/[0-9a-f]{40}\), \[#13\]\(https:\/\/github\.com\/webanion\/termi\/pull\/13\)\)/,
    );
    assert.match(written.out, /### Other\n\n- Tweak /);
    assert.doesNotMatch(written.out, /Merge pull request|add Termi terminal app|release v0\.1\.0/);

    const file = readFileSync(join(repo.dir, 'CHANGELOG.md'), 'utf8');
    assert.ok(file.startsWith(HEADER));
    assert.ok(file.indexOf('## v0.1.1') < file.indexOf('## v0.1.0'));

    const notes = cli('notes', 'v0.1.1');
    assert.equal(notes.code, 0);
    assert.match(notes.out, /^\[Compare with v0\.1\.0\]/);
    assert.doesNotMatch(notes.out, /## v0\.1\.0/);
    assert.equal(cli('notes', '0.1.0').code, 0);
    assert.equal(cli('notes', '9.9.9').code, 1);

    setVersion('0.1.1');
    git('add', '.');
    git('commit', '-q', '-m', 'chore: release v0.1.1');
    git('tag', 'v0.1.1');
    commit('feat(mcp)!: rename a tool');
    assert.equal(cli('suggest').out.trim(), 'minor');
  } finally {
    repo.cleanup();
  }
});

test('the CLI rejects a missing or malformed argument', () => {
  const repo = scratchRepo();
  try {
    assert.equal(repo.cli('write', 'next').code, 2);
    assert.equal(repo.cli('lint').code, 1);
    assert.equal(repo.cli('publish').code, 2);
  } finally {
    repo.cleanup();
  }
});
