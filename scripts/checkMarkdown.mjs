#!/usr/bin/env node
// Checks every Markdown file git tracks for hard-wrapped text: one paragraph, list item or quote
// broken over several lines. Markdown here is read in viewers that wrap on their own, so a
// paragraph broken at 80 columns renders as a narrow ribbon with half the page empty. The rule is
// one line per paragraph, and CI's hygiene job runs this to hold it.
//
//   node scripts/checkMarkdown.mjs              every .md file git tracks
//   node scripts/checkMarkdown.mjs README.md    the files named
//
// It reads files and changes nothing. It exits 1 on any hard wrap, naming the file and lines.
//
// A hard wrap is a line of text that continues the line above it instead of starting a block of
// its own. Blank lines, headings, table rows, lines of HTML, horizontal rules, setext underlines
// and link reference definitions are blocks of their own, so a table row under a table row passes
// and a heading over a paragraph passes. A list item and a quote line each start a paragraph and
// are one line, so a plain line of text right under either is that item or quote wrapped. A list
// item under a list item passes, and so does a quote line under a bare `>`, the paragraph break
// inside a quote. A fenced block, opened by three or more backticks or tildes and closed by at
// least as many of the same, is skipped whole.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FENCE_OPEN = /^\s*(`{3,}|~{3,})/;
const FENCE_CLOSE = /^\s*(`+|~+)\s*$/;
const BLOCK = /^\s*(#{1,6}(\s|$)|\||<|=+\s*$|\[[^\]]+\]:\s|(-\s*){3,}$|(\*\s*){3,}$|(_\s*){3,}$)/;
const ITEM = /^\s*([-*+]|\d+[.)])(\s|$)/;
const QUOTE = /^\s*>\s?(.*)$/;

// The hard wraps in one file's text: for each, the first and last line (1-based) and what was
// wrapped.
export function hardWraps(text) {
  const wraps = [];
  let open = null; // { kind, start, end } of the paragraph being read
  let fence = null; // { char, length } while inside a fenced block

  const close = () => {
    if (open && open.end > open.start) wraps.push({ ...open });
    open = null;
  };
  const start = (kind, n) => {
    close();
    open = { kind, start: n, end: n };
  };

  text.split('\n').forEach((line, i) => {
    const n = i + 1;
    if (fence) {
      const run = FENCE_CLOSE.exec(line)?.[1];
      if (run && run[0] === fence.char && run.length >= fence.length) fence = null;
      return;
    }
    const opening = FENCE_OPEN.exec(line)?.[1];
    if (opening) {
      fence = { char: opening[0], length: opening.length };
      close();
    } else if (line.trim() === '' || BLOCK.test(line)) {
      close();
    } else if (ITEM.test(line)) {
      start('list item', n);
    } else if (QUOTE.test(line)) {
      const inner = QUOTE.exec(line)?.[1] ?? '';
      if (inner.trim() === '' || BLOCK.test(inner)) close();
      else if (ITEM.test(inner)) start('list item', n);
      else if (open?.quote) open.end = n;
      else {
        start('blockquote', n);
        open.quote = true;
      }
    } else if (!open) {
      start('paragraph', n);
    } else {
      open.end = n;
    }
  });
  close();
  return wraps.map(({ kind, start: first, end }) => ({ kind, start: first, end }));
}

export function trackedMarkdown(cwd = process.cwd()) {
  const out = execFileSync('git', ['ls-files', '-z', '--', '*.md'], { cwd, encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

// Prints every hard wrap in the files and returns the exit code: 0 when there is none.
export function check(files, read = (file) => readFileSync(file, 'utf8'), log = console.log) {
  let total = 0;
  for (const file of files) {
    for (const wrap of hardWraps(read(file))) {
      log(
        `${file}:${wrap.start}: hard wrap, one ${wrap.kind} over lines ${wrap.start} to ${wrap.end}`,
      );
      total += 1;
    }
  }
  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
  log(`${plural(files.length, 'Markdown file')}, ${plural(total, 'hard wrap')}.`);
  return total === 0 ? 0 : 1;
}

const script = process.argv[1];
if (script && existsSync(script) && realpathSync(script) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  process.exitCode = check(args.length ? args : trackedMarkdown());
}
