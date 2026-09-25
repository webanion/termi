import { describe, expect, it } from 'vitest';
import { layoutIds, LAYOUTS } from '../../../src/shared/layouts';
import {
  isSavedCommandShape,
  MAX_TERMINALS,
  savedCommandError,
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
    expect(isSavedCommandShape({ name: 'x', terminals: [] })).toBe(false);
    expect(isSavedCommandShape(null)).toBe(false);
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
