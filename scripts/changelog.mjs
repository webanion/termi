#!/usr/bin/env node
// Termi's changelog, built from Conventional Commits. It has no dependencies and runs from the
// repository root:
//
//   node scripts/changelog.mjs lint <range>       fail on any commit subject in <range> that is not conventional
//   node scripts/changelog.mjs suggest            the bump the commits since the last release call for
//   node scripts/changelog.mjs write <version>    prepend the section for <version> to CHANGELOG.md and print it
//   node scripts/changelog.mjs notes <version>    print the body of that version's section, for the GitHub Release
//
// A release is a `v<version>` tag. The section for a new version holds every non-merge commit since
// the previous release, grouped by type, each linked to its commit and, when it came in through a
// pull request, to that pull request. The previous release is the highest `v<version>` tag reachable
// from HEAD that sorts below the version being written. Tags above it are ignored, so the tags left
// from the builds before numbering restarted at 0.1.0 do not count while the version is below them.
// With no tag below it, the section covers every commit from the start.
//
// Commit subjects follow Conventional Commits: `type(scope)!: summary`. A `!` or a `BREAKING CHANGE:`
// footer marks a breaking change. A subject that does not parse lands under "Other" and says nothing
// about what changed, which is what `lint` catches. The release commit, `chore: release v<version>`,
// is never a line of its own, and neither are the `chore: release version <version>` commits of the
// builds before 0.1.0.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const REPO_URL = 'https://github.com/webanion/termi';

export const TYPES = [
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactoring'],
  ['docs', 'Documentation'],
  ['build', 'Build and CI'],
  ['ci', 'Build and CI'],
  ['test', 'Tests'],
  ['chore', 'Other'],
  ['style', 'Other'],
  ['revert', 'Other'],
];
const KNOWN = new Set(TYPES.map(([t]) => t));
const SUBJECT = /^(?<type>[a-z]+)(?:\((?<scope>[^()\r\n]+)\))?(?<bang>!)?: (?<summary>\S.*)$/;
const RELEASE_COMMIT = /^chore(?:\(release\))?: release (?:version )?v?\d/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;
const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parseCommit({ sha, subject, body = '' }) {
  const m = SUBJECT.exec(subject);
  if (!m || !KNOWN.has(m.groups.type)) {
    return {
      sha,
      subject,
      type: null,
      scope: null,
      summary: subject,
      breaking: BREAKING_FOOTER.test(body),
    };
  }
  return {
    sha,
    subject,
    type: m.groups.type,
    scope: m.groups.scope ?? null,
    summary: m.groups.summary,
    breaking: Boolean(m.groups.bang) || BREAKING_FOOTER.test(body),
  };
}

export function lintSubjects(subjects) {
  return subjects
    .filter((s) => !RELEASE_COMMIT.test(s))
    .filter((s) => {
      const m = SUBJECT.exec(s);
      return !m || !KNOWN.has(m.groups.type);
    });
}

// Below 1.0 a breaking change bumps the minor and anything else the patch, as npm's caret reads
// 0.x: ^0.5.0 accepts 0.5.x only. From 1.0 on it is plain semver.
export function suggestBump(commits, currentVersion) {
  const parsed = commits.map(parseCommit).filter((c) => !RELEASE_COMMIT.test(c.subject));
  if (!parsed.length) return null;
  const breaking = parsed.some((c) => c.breaking);
  const feature = parsed.some((c) => c.type === 'feat');
  if (/^0\./.test(currentVersion)) return breaking ? 'minor' : 'patch';
  return breaking ? 'major' : feature ? 'minor' : 'patch';
}

export function parseVersion(text) {
  const m = VERSION.exec(text);
  if (!m) return null;
  return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] };
}

// Semver precedence: the three numbers, then a pre-release sorts below its release, and
// pre-release fields compare as numbers when both are numeric and as text otherwise.
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) throw new Error(`cannot compare ${a} with ${b}`);
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] - y.core[i];
  if (!x.pre.length || !y.pre.length) return y.pre.length - x.pre.length;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i];
    const q = y.pre[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    const pNumeric = /^\d+$/.test(p);
    const qNumeric = /^\d+$/.test(q);
    if (pNumeric && qNumeric) return Number(p) - Number(q);
    if (pNumeric !== qNumeric) return pNumeric ? -1 : 1;
    return p < q ? -1 : 1;
  }
  return 0;
}

// The release before `version`: the highest `v<version>` tag below it, or at or below it with
// `inclusive`, which is how `suggest` finds the release package.json already names.
export function previousRelease(tags, version, { inclusive = false } = {}) {
  const earlier = tags.filter((tag) => {
    if (!tag.startsWith('v') || !parseVersion(tag)) return false;
    const order = compareVersions(tag, version);
    return inclusive ? order <= 0 : order < 0;
  });
  return earlier.sort(compareVersions).at(-1) ?? null;
}

export function renderSection({ version, previousTag, date, commits, prs = new Map() }) {
  const lines = [`## v${version} (${date})`, ''];
  if (previousTag) {
    lines.push(
      `[Compare with ${previousTag}](${REPO_URL}/compare/${previousTag}...v${version})`,
      '',
    );
  }
  const parsed = commits.map(parseCommit).filter((c) => !RELEASE_COMMIT.test(c.subject));
  const line = (c) => {
    const scope = c.scope ? `**${c.scope}:** ` : '';
    const pr = prs.get(c.sha);
    const refs = [`[${c.sha.slice(0, 7)}](${REPO_URL}/commit/${c.sha})`];
    if (pr) refs.push(`[#${pr}](${REPO_URL}/pull/${pr})`);
    return `- ${scope}${c.summary} (${refs.join(', ')})`;
  };
  const groups = [];
  const breaking = parsed.filter((c) => c.breaking);
  if (breaking.length) groups.push(['Breaking changes', breaking]);
  const titles = [...new Set(TYPES.map(([, title]) => title))];
  for (const title of titles) {
    const types = TYPES.filter(([, t]) => t === title).map(([t]) => t);
    const items = parsed.filter(
      (c) => !c.breaking && (types.includes(c.type) || (title === 'Other' && c.type === null)),
    );
    if (items.length) groups.push([title, items]);
  }
  if (!groups.length) lines.push('No changes recorded.', '');
  for (const [title, items] of groups) lines.push(`### ${title}`, '', ...items.map(line), '');
  return lines.join('\n');
}

// Newest first: the section goes above the first existing one, below the introduction.
export function insertSection(changelog, section) {
  const text = changelog.trim() ? changelog : '# Changelog\n';
  const at = text.search(/^## /m);
  if (at === -1) return `${text.trimEnd()}\n\n${section.trimEnd()}\n`;
  return `${text.slice(0, at)}${section.trimEnd()}\n\n${text.slice(at)}`;
}

export function extractNotes(changelog, version) {
  const start = changelog.indexOf(`\n## v${version} `);
  if (start === -1) return null;
  const rest = changelog.slice(start + 1);
  const end = rest.indexOf('\n## ', 1);
  const section = end === -1 ? rest : rest.slice(0, end + 1);
  return section.split('\n').slice(1).join('\n').trim() + '\n';
}

// --- git ------------------------------------------------------------------------------------

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function reachableTags() {
  return git('tag', '--merged', 'HEAD', '--list', 'v[0-9]*').split('\n').filter(Boolean);
}

function commitsIn(range) {
  const out = git('log', '--no-merges', '--format=%H%x1f%s%x1f%b%x1e', ...(range ? [range] : []));
  return out
    .split('\x1e')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [sha, subject, body] = r.split('\x1f');
      return { sha, subject, body: body ?? '' };
    });
}

// Which pull request brought each commit in: a merge commit "Merge pull request #N from ..." owns
// every commit between its two parents, and a squash merge carries "(#N)" at the end of its subject.
function pullRequests(range) {
  const prs = new Map();
  const merges = git(
    'log',
    '--merges',
    '--first-parent',
    '--format=%H%x1f%s',
    ...(range ? [range] : []),
  );
  for (const row of merges.split('\n').filter(Boolean)) {
    const [sha, subject] = row.split('\x1f');
    const m = /^Merge pull request #(\d+) /.exec(subject);
    if (!m) continue;
    for (const c of git('rev-list', `${sha}^1..${sha}^2`).split('\n').filter(Boolean)) {
      if (!prs.has(c)) prs.set(c, m[1]);
    }
  }
  for (const c of commitsIn(range)) {
    const m = /\(#(\d+)\)$/.exec(c.subject);
    if (m && !prs.has(c.sha)) prs.set(c.sha, m[1]);
  }
  return prs;
}

// --- cli ------------------------------------------------------------------------------------

function main([command, arg]) {
  const file = 'CHANGELOG.md';
  if (command === 'lint') {
    if (!arg) throw new Error('lint needs a range, e.g. origin/main..HEAD');
    const bad = lintSubjects(commitsIn(arg).map((c) => c.subject));
    for (const s of bad) console.error(`not a conventional commit: ${s}`);
    if (bad.length) {
      console.error(
        `\n${bad.length} commit subject(s) do not follow "type(scope): summary" with type one of ${[...KNOWN].join(', ')}.`,
      );
      return 1;
    }
    console.log('every commit subject is conventional');
    return 0;
  }
  if (command === 'suggest') {
    const current = JSON.parse(readFileSync('package.json', 'utf8')).version;
    const tag = previousRelease(reachableTags(), current, { inclusive: true });
    console.log(suggestBump(commitsIn(tag ? `${tag}..HEAD` : null), current) ?? 'none');
    return 0;
  }
  if (command === 'write') {
    if (!arg) throw new Error('write needs the new version');
    const version = arg.replace(/^v/, '');
    if (!parseVersion(version)) {
      console.error(`not a version: ${arg}`);
      return 2;
    }
    const changelog = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (extractNotes(changelog, version) !== null) {
      console.error(`${file} already has a section for v${version}`);
      return 1;
    }
    const tag = previousRelease(reachableTags(), version);
    const range = tag ? `${tag}..HEAD` : null;
    const commits = commitsIn(range);
    if (!commits.some((c) => !RELEASE_COMMIT.test(c.subject))) {
      console.error(`nothing to release: no commits since ${tag ?? 'the start'}`);
      return 1;
    }
    const date = new Date().toISOString().slice(0, 10);
    const prs = pullRequests(range);
    const section = renderSection({ version, previousTag: tag, date, commits, prs });
    writeFileSync(file, insertSection(changelog, section));
    process.stdout.write(section);
    return 0;
  }
  if (command === 'notes') {
    if (!arg) throw new Error('notes needs a version');
    const version = arg.replace(/^v/, '');
    const notes = existsSync(file) ? extractNotes(readFileSync(file, 'utf8'), version) : null;
    if (!notes) {
      console.error(`${file} has no section for v${version}`);
      return 1;
    }
    process.stdout.write(notes);
    return 0;
  }
  console.error('usage: changelog.mjs lint <range> | suggest | write <version> | notes <version>');
  return 2;
}

// Compare real paths, so the check holds when the checkout sits behind a symlink, as /tmp does on macOS.
const script = process.argv[1];
if (script && existsSync(script) && realpathSync(script) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
