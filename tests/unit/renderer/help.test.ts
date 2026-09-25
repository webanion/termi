// The in-app help: the guide's pages and their reader, the shortcut sheet, the command palette
// and the Report an Issue link.
import { describe, expect, it } from 'vitest';
import { GUIDE_PAGES } from '../../../src/renderer/guidePages';
import { parseGuide, parseInline } from '../../../src/renderer/guideMarkdown';
import { keysFor } from '../../../src/renderer/HelpKeys';
import { issueUrl, releaseNotesUrl } from '../../../src/renderer/helpLinks';
import { filterPalette, paletteItems } from '../../../src/renderer/palette';
import { shortcutRows } from '../../../src/renderer/shortcutRows';
import { actionLabel, PALETTE_ACTIONS } from '../../../src/shared/appActions';
import { SHORTCUT_ACTIONS } from '../../../src/shared/shortcuts';

describe('the guide', () => {
  it('has pages that each start with a title and hold text', () => {
    expect(GUIDE_PAGES.length).toBe(5);
    for (const page of GUIDE_PAGES) {
      const blocks = parseGuide(page.source);
      expect(blocks[0]?.kind).toBe('title');
      expect(blocks.length).toBeGreaterThan(1);
    }
  });

  it('names only shortcuts that exist, on both platforms', () => {
    for (const page of GUIDE_PAGES) {
      const names = [...page.source.matchAll(/\{([a-z0-9-]+)\}/g)].map((m) => m[1] ?? '');
      for (const name of names) {
        expect(keysFor(name, 'darwin'), name).not.toBeNull();
        expect(keysFor(name, 'linux'), name).not.toBeNull();
      }
    }
  });

  it('reads code, bold and keys, and leaves markup as text', () => {
    expect(parseInline('Press {new-terminal} or type `exit`, **now**')).toEqual([
      { kind: 'text', text: 'Press ' },
      { kind: 'keys', name: 'new-terminal' },
      { kind: 'text', text: ' or type ' },
      { kind: 'code', text: 'exit' },
      { kind: 'text', text: ', ' },
      { kind: 'strong', text: 'now' },
    ]);
    const markup = '<img src=x onerror="alert(1)">';
    expect(parseInline(markup)).toEqual([{ kind: 'text', text: markup }]);
  });

  it('groups list items and keeps paragraphs apart', () => {
    const blocks = parseGuide('# Title\n\nOne.\n\n- a\n- b\n\n## Sub\nTwo.');
    expect(blocks.map((b) => b.kind)).toEqual([
      'title',
      'paragraph',
      'list',
      'heading',
      'paragraph',
    ]);
    const list = blocks[2];
    expect(list?.kind === 'list' && list.items.length).toBe(2);
  });
});

describe('the shortcut sheet', () => {
  it('lists every shortcut in the table, and a link click', () => {
    const rows = shortcutRows('linux');
    const listed = SHORTCUT_ACTIONS.filter((a) => !a.startsWith('select-terminal-'));
    for (const action of listed) {
      expect(rows.some((r) => r.label === actionLabel(action).replace(/…$/, ''))).toBe(true);
    }
    expect(rows).toContainEqual({ label: 'Terminal 1 to 9', keys: 'Alt+1 to Alt+9' });
    expect(rows).toContainEqual({ label: 'Open a link', keys: 'Ctrl+click' });
    expect(shortcutRows('darwin')).toContainEqual({ label: 'New Terminal', keys: '⌘T' });
  });
});

describe('the command palette', () => {
  const items = paletteItems('linux', [{ id: 7, name: 'Shop' }]);

  it('lists the page actions with their keys, and the running terminals', () => {
    expect(items.map((i) => i.key)).toEqual([...PALETTE_ACTIONS, 'tab-7']);
    expect(items.find((i) => i.key === 'new-terminal')?.keys).toBe('Ctrl+Shift+T');
    expect(items.find((i) => i.key === 'tab-7')).toMatchObject({
      label: 'Go to Shop',
      keys: 'Alt+1',
      run: { tabId: 7 },
    });
  });

  it('keeps the items whose label holds every word', () => {
    expect(filterPalette(items, 'TEXT size').map((i) => i.key)).toEqual(['font-reset']);
    expect(filterPalette(items, 'shop').map((i) => i.key)).toEqual(['tab-7']);
    expect(filterPalette(items, '')).toHaveLength(items.length);
    expect(filterPalette(items, 'nothing like this')).toEqual([]);
  });
});

describe('the help links', () => {
  it('fills in the version, the system and the shell, and nothing else', () => {
    const url = new URL(
      issueUrl({ platform: 'darwin', version: '0.2.0', home: '/Users/x' }, 'zsh'),
    );
    expect(url.origin + url.pathname).toBe('https://github.com/webanion/termi/issues/new');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      template: 'bug_report.yml',
      version: '0.2.0',
      system: 'macOS',
      shell: 'zsh',
    });
  });

  it('opens the release of the running version', () => {
    expect(releaseNotesUrl('0.2.0')).toBe('https://github.com/webanion/termi/releases/tag/v0.2.0');
  });
});
