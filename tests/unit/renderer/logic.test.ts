// @vitest-environment jsdom
import './stubTermi';
import { describe, expect, it } from 'vitest';
import {
  focusedProc,
  isBusy,
  layoutFor,
  readyTabs,
  type PaneState,
  type TabState,
} from '../../../src/renderer/appStore';
import { commandLabel, commandSummary } from '../../../src/renderer/commandText';
import { formatBytes } from '../../../src/renderer/format';

const pane = (overrides: Partial<PaneState> = {}): PaneState => ({
  id: 'p1',
  command: '',
  proc: 'zsh',
  shellName: 'zsh',
  attached: true,
  ...overrides,
});

const tab = (overrides: Partial<TabState> = {}): TabState => ({
  id: 1,
  name: 'zsh',
  customName: false,
  commandId: null,
  activity: false,
  layout: null,
  panes: [pane()],
  focusedPaneId: 'p1',
  ready: true,
  ...overrides,
});

describe('layoutFor', () => {
  const panes = (n: number) => Array.from({ length: n }, (_, i) => pane({ id: `p${i}` }));

  it('has no layout for one terminal', () => {
    expect(layoutFor(tab())).toBeNull();
  });

  it('uses the saved layout when it fits, and the default otherwise', () => {
    expect(layoutFor(tab({ panes: panes(4), layout: 'rows' }))?.id).toBe('rows');
    expect(layoutFor(tab({ panes: panes(4) }))?.id).toBe('grid');
    expect(layoutFor(tab({ panes: panes(2), layout: 'grid' }))?.id).toBe('columns');
    expect(layoutFor(tab({ panes: panes(3) }))?.id).toBe('main-left');
  });
});

describe('isBusy', () => {
  it('is idle while the shell itself is in the foreground, login dash or not', () => {
    expect(isBusy(pane({ proc: 'zsh' }))).toBe(false);
    expect(isBusy(pane({ proc: '-zsh' }))).toBe(false);
    expect(isBusy(pane({ proc: '' }))).toBe(false);
  });

  it('is busy when another program runs', () => {
    expect(isBusy(pane({ proc: 'vim' }))).toBe(true);
  });
});

describe('focusedProc', () => {
  it('names the program in the focused pane, unless it is the tab name', () => {
    expect(focusedProc(tab({ panes: [pane({ proc: 'vim' })] }))).toBe('vim');
    expect(focusedProc(tab({ name: 'vim', panes: [pane({ proc: 'vim' })] }))).toBe('');
    expect(focusedProc(tab())).toBe('');
  });
});

describe('readyTabs', () => {
  it('leaves out tabs whose shells are still starting', () => {
    const tabs = [tab({ id: 1 }), tab({ id: 2, ready: false }), tab({ id: 3 })];
    expect(readyTabs(tabs).map((t) => t.id)).toEqual([1, 3]);
  });
});

describe('command text', () => {
  it('shows a multi-line command on one line', () => {
    expect(commandLabel('  cd api \n\n npm run dev  ')).toBe('cd api; npm run dev');
  });

  it('summarises every terminal, naming a plain shell', () => {
    expect(
      commandSummary({
        id: 'a',
        name: 'Dev',
        terminals: [{ command: 'npm run api' }, { command: '' }],
      }),
    ).toBe('npm run api\nPlain shell');
  });
});

describe('formatBytes', () => {
  it('switches unit at 1000 so a value never needs four digits', () => {
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(1000)).toBe('1.0 KB');
    expect(formatBytes(1536, '/s')).toBe('1.5 KB/s');
    expect(formatBytes(20 * 1024 ** 2)).toBe('20 MB');
    expect(formatBytes(34 * 1024 ** 3, '', true)).toBe('34G');
  });
});
