// Tests for scripts/checkMarkdown.mjs: which lines count as a hard wrap, and what the check
// prints and returns.
//
// Run: npm run test:scripts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check, hardWraps } from './checkMarkdown.mjs';

const lines = (...rows) => rows.join('\n');

test('finds a paragraph, a list item and a quote broken over lines', () => {
  const text = lines(
    'One paragraph that goes on',
    'onto a second line.',
    '',
    '- A list item that goes on',
    '  onto a second line.',
    '',
    '> A quote that goes on',
    '> onto a second line.',
  );
  assert.deepEqual(hardWraps(text), [
    { kind: 'paragraph', start: 1, end: 2 },
    { kind: 'list item', start: 4, end: 5 },
    { kind: 'blockquote', start: 7, end: 8 },
  ]);
});

test('passes one line per paragraph, list item and quote', () => {
  const text = lines(
    '# A heading',
    'A paragraph right under a heading.',
    '',
    '- One item.',
    '- Another item.',
    '  - A nested item.',
    '1. A numbered item.',
    '2) Another numbered item.',
    '',
    '> A quote.',
    '>',
    '> Another paragraph of the quote.',
    '> - A list in a quote.',
  );
  assert.deepEqual(hardWraps(text), []);
});

test('treats tables, HTML, rules, underlines and link references as blocks of their own', () => {
  const text = lines(
    '| Path | What |',
    '| --- | --- |',
    '| src | The code. |',
    'Text under a table.',
    '<details>',
    '<summary>More</summary>',
    'Text under HTML.',
    '---',
    'Text under a rule.',
    '***',
    '___',
    'A setext heading',
    '===',
    '[ref]: https://example.com',
    '[other]: https://example.com',
  );
  assert.deepEqual(hardWraps(text), []);
});

test('skips fenced blocks whole, of backticks or tildes, closed by a long enough run', () => {
  const text = lines(
    '```sh',
    'a command that',
    'goes on over lines',
    '```',
    '',
    '~~~~',
    'text',
    '~~~',
    'still inside, since three tildes do not close four',
    '~~~~',
    '',
    '    ````',
    '    indented fence',
    '    lines',
    '    ````',
  );
  assert.deepEqual(hardWraps(text), []);
});

test('ends a paragraph at a fence, so text over a fence is not a wrap', () => {
  const text = lines('Text right over a fence.', '```', 'code', '```', 'Text right under it.');
  assert.deepEqual(hardWraps(text), []);
});

test('prints each wrap with its file and lines, and returns 1 only when there is one', () => {
  const files = { 'a.md': 'One\ntwo.\n', 'b.md': 'Clean.\n' };
  const printed = [];
  const code = check(
    Object.keys(files),
    (file) => files[file],
    (line) => printed.push(line),
  );
  assert.equal(code, 1);
  assert.deepEqual(printed, [
    'a.md:1: hard wrap, one paragraph over lines 1 to 2',
    '2 Markdown files, 1 hard wrap.',
  ]);
  const clean = [];
  assert.equal(
    check(
      ['b.md'],
      (file) => files[file],
      (line) => clean.push(line),
    ),
    0,
  );
  assert.deepEqual(clean, ['1 Markdown file, 0 hard wraps.']);
});
