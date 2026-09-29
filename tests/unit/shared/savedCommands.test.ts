import { describe, expect, it } from 'vitest';
import { layoutIds, LAYOUTS } from '../../../src/shared/layouts';
import {
  isSavedCommandShape,
  keepTitles,
  MAX_TERMINALS,
  MAX_TITLE,
  savedCommandError,
  savedTerminal,
} from '../../../src/shared/savedCommands';
import type { SavedCommand } from '../../../src/shared/types';

const command = (overrides: Partial<SavedCommand> = {}): SavedCommand => ({
  id: 'id1',
  name: 'Dev',
  terminals: [{ command: 'npm run dev' }],
  ...overrides,
});
const terminals = (...commands: string[]) => commands.map((c) => ({ command: c }));

describe('savedCommandError', () => {
  it('accepts a command that follows the rules', () => {
    expect(savedCommandError(command())).toBeNull();
    expect(
      savedCommandError(command({ terminals: terminals('a', ''), layout: 'rows' })),
    ).toBeNull();
  });

  it('needs a name', () => {
    expect(savedCommandError(command({ name: '' }))).toMatch(/name must not be empty/);
  });

  it('needs 1 to 4 terminals', () => {
    expect(savedCommandError(command({ terminals: [] }))).toMatch(/at least 1 terminal/);
    expect(savedCommandError(command({ terminals: terminals('a', 'b', 'c', 'd', 'e') }))).toMatch(
      /at most 4 terminals/,
    );
    expect(MAX_TERMINALS).toBe(4);
  });

  it('needs a command in the first terminal, but not in later ones', () => {
    expect(savedCommandError(command({ terminals: terminals('', 'b') }))).toMatch(
      /first terminal needs a command/,
    );
    expect(savedCommandError(command({ terminals: terminals('a', '', '') }))).toBeNull();
  });

  it('limits the length of a title', () => {
    const titled = (title: string) =>
      command({ terminals: [{ command: 'a' }, { command: 'b', title }] });
    expect(savedCommandError(titled('x'.repeat(MAX_TITLE)))).toBeNull();
    expect(savedCommandError(titled('x'.repeat(MAX_TITLE + 1)))).toMatch(
      /title of terminal 2 can have at most 60 characters/,
    );
    expect(MAX_TITLE).toBe(60);
  });

  it('needs a layout that fits the number of terminals', () => {
    expect(savedCommandError(command({ layout: 'rows' }))).toMatch(/2 to 4 terminals/);
    expect(savedCommandError(command({ terminals: terminals('a', 'b'), layout: 'grid' }))).toMatch(
      /must be one of: columns, rows/,
    );
    expect(
      savedCommandError(command({ terminals: terminals('a', 'b', 'c', 'd'), layout: 'grid' })),
    ).toBeNull();
  });
});

describe('isSavedCommandShape', () => {
  it('checks the types only', () => {
    expect(isSavedCommandShape(command())).toBe(true);
    expect(isSavedCommandShape(command({ name: '', terminals: [] }))).toBe(true);
    expect(isSavedCommandShape({ ...command(), autoStart: 'yes' })).toBe(false);
    expect(isSavedCommandShape({ ...command(), terminals: [{ command: 1 }] })).toBe(false);
    expect(isSavedCommandShape(command({ terminals: [{ command: 'a', title: 'API' }] }))).toBe(
      true,
    );
    for (const title of [1, null, true, ['API'], { text: 'API' }]) {
      const terminal = { command: 'a', title } as unknown as { command: string };
      expect(isSavedCommandShape(command({ terminals: [terminal] })), String(title)).toBe(false);
    }
    expect(isSavedCommandShape({ name: 'x', terminals: [] })).toBe(false);
    expect(isSavedCommandShape(null)).toBe(false);
  });
});

describe('savedTerminal', () => {
  it('trims the command and the title, and leaves out an empty title', () => {
    expect(savedTerminal('  npm run api ', '  API  ')).toEqual({
      command: 'npm run api',
      title: 'API',
    });
    expect(savedTerminal('ls', '   ')).toEqual({ command: 'ls' });
    expect(savedTerminal('ls')).toEqual({ command: 'ls' });
    expect('title' in savedTerminal('ls', '')).toBe(false);
  });
});

describe('keepTitles', () => {
  const before = [
    { command: 'npm run api', title: 'API' },
    { command: 'npm run web', title: 'Web' },
    { command: '', title: 'Shell' },
  ];

  it('keeps the title of a terminal whose command and place are the same', () => {
    expect(keepTitles(before, terminals('npm run api', 'npm run web', ''))).toEqual(before);
    expect(keepTitles(before, terminals('npm run api', 'npm run web', '', 'npm test'))).toEqual([
      ...before,
      { command: 'npm test' },
    ]);
  });

  it('drops the title of a terminal whose command or place changed', () => {
    expect(keepTitles(before, terminals('npm run api', 'npm run worker', ''))).toEqual([
      { command: 'npm run api', title: 'API' },
      { command: 'npm run worker' },
      { command: '', title: 'Shell' },
    ]);
    // Removing the first terminal moves the others up a place, so none keeps its title.
    expect(keepTitles(before, terminals('npm run web', ''))).toEqual(terminals('npm run web', ''));
  });

  it('drops every title when 1 terminal is left', () => {
    expect(keepTitles(before, terminals('npm run api'))).toEqual(terminals('npm run api'));
  });

  it('keeps the terminals as they are when none had a title', () => {
    expect(keepTitles(terminals('a', 'b'), terminals('a', 'c'))).toEqual(terminals('a', 'c'));
  });
});

describe('layouts', () => {
  it('offers layouts for 2 to 4 terminals, the first being the default', () => {
    expect(layoutIds(1)).toBeUndefined();
    expect(layoutIds(2)).toEqual(['columns', 'rows']);
    expect(layoutIds(3)).toEqual(['main-left', 'main-top', 'columns', 'rows']);
    expect(layoutIds(4)).toEqual(['grid', 'main-left', 'columns', 'rows']);
    expect(layoutIds(5)).toBeUndefined();
  });

  it('gives every terminal of a layout an area, in order', () => {
    for (const [count, list] of Object.entries(LAYOUTS)) {
      for (const layout of list) {
        const letters = [...new Set(layout.areas.join(' ').split(' '))].sort();
        expect(letters).toEqual(['a', 'b', 'c', 'd'].slice(0, Number(count)));
      }
    }
  });
});
