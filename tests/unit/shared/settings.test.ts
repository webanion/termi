import { describe, expect, it } from 'vitest';
import {
  cleanSettingsPatch,
  clampFontSize,
  DEFAULT_SETTINGS,
  readSettingsFile,
  SETTINGS_VERSION,
} from '@/shared/settings';

describe('readSettingsFile', () => {
  it('gives the defaults for a missing or broken file', () => {
    for (const raw of [null, undefined, 'not json', 42, []]) {
      expect(readSettingsFile(raw)).toEqual({ ...DEFAULT_SETTINGS, version: SETTINGS_VERSION });
    }
  });

  it('merges the defaults under the saved settings', () => {
    const file = readSettingsFile({ version: 1, fontSize: 16, commands: [] });
    expect(file.fontSize).toBe(16);
    expect(file.sidebarWidth).toBe(DEFAULT_SETTINGS.sidebarWidth);
    expect(file.sidebarHidden).toBe(false);
  });

  it('migrates a version 0 file: a single command becomes a list of terminals', () => {
    const file = readSettingsFile({
      commands: [
        { id: 'a', name: 'Old', command: 'npm run dev', cwd: '~/code' },
        { id: 'b', name: 'New', terminals: [{ command: 'ls' }] },
      ],
    });
    expect(file.version).toBe(SETTINGS_VERSION);
    expect(file.commands).toEqual([
      { id: 'a', name: 'Old', cwd: '~/code', terminals: [{ command: 'npm run dev' }] },
      { id: 'b', name: 'New', terminals: [{ command: 'ls' }] },
    ]);
  });

  it('migrates a version 1 file: the guide has not been seen', () => {
    const file = readSettingsFile({ version: 1, commands: [], fontSize: 15 });
    expect(file.version).toBe(SETTINGS_VERSION);
    expect(file.guideSeen).toBe(false);
    expect(file.fontSize).toBe(15);
  });

  it('migrates a version 2 file: its terminals stay as they are, with no titles', () => {
    const commands = [{ id: 'a', name: 'Pair', terminals: [{ command: 'ls' }, { command: '' }] }];
    const file = readSettingsFile({ version: 2, commands, guideSeen: true });
    expect(file.version).toBe(SETTINGS_VERSION);
    expect(file.commands).toEqual(commands);
    expect(file.guideSeen).toBe(true);
  });

  it('reads the title of each terminal', () => {
    const terminals = [{ command: 'npm run api', title: 'API' }, { command: '' }];
    const file = readSettingsFile({ version: 3, commands: [{ id: 'a', name: 'Dev', terminals }] });
    expect(file.commands[0]?.terminals).toEqual(terminals);
  });

  it('migrates a version 3 file: the cursor stays a blinking bar', () => {
    const file = readSettingsFile({ version: 3, commands: [], fontSize: 15, guideSeen: true });
    expect(file.version).toBe(SETTINGS_VERSION);
    expect(file).toMatchObject({ cursorStyle: 'bar', cursorBlink: true, fontSize: 15 });
    expect(SETTINGS_VERSION).toBe(4);
  });

  it('reads the cursor settings', () => {
    const file = readSettingsFile({ version: 4, cursorStyle: 'block', cursorBlink: false });
    expect(file).toMatchObject({ cursorStyle: 'block', cursorBlink: false });
  });

  it('gives a setting edited to a value the app cannot use its default', () => {
    const file = readSettingsFile({
      version: 4,
      fontSize: 'big',
      cursorStyle: 'beam',
      cursorBlink: 'yes',
      sidebarHidden: 0,
      sidebarWidth: null,
      guideSeen: 'no',
    });
    const { commands: _, ...defaults } = DEFAULT_SETTINGS;
    expect(file).toMatchObject(defaults);
  });

  it('brings a text size edited out of the range into it, as a whole number', () => {
    expect(readSettingsFile({ version: 4, fontSize: 100 }).fontSize).toBe(28);
    expect(readSettingsFile({ version: 4, fontSize: 2 }).fontSize).toBe(9);
    expect(readSettingsFile({ version: 4, fontSize: 14.4 }).fontSize).toBe(14);
    expect(clampFontSize(Number.POSITIVE_INFINITY)).toBe(28);
  });

  it('keeps guideSeen once it is set', () => {
    expect(readSettingsFile({ version: 2, commands: [], guideSeen: true }).guideSeen).toBe(true);
  });

  it('keeps keys it does not know, so a newer build keeps its settings', () => {
    const file = readSettingsFile({ version: 1, commands: [], future: { on: true } });
    expect(file.future).toEqual({ on: true });
  });

  it('keeps the version of a file a newer build wrote', () => {
    expect(readSettingsFile({ version: SETTINGS_VERSION + 1, commands: [] }).version).toBe(
      SETTINGS_VERSION + 1,
    );
  });

  it('leaves out saved commands that do not have the shape of one', () => {
    const file = readSettingsFile({
      version: 1,
      commands: [
        { id: 'ok', name: 'Fine', terminals: [{ command: 'ls' }] },
        { id: 'no-name', terminals: [{ command: 'ls' }] },
        { id: 'bad-terminal', name: 'x', terminals: [{ command: 5 }] },
        { id: 'bad-title', name: 'x', terminals: [{ command: 'ls', title: 5 }] },
        'not a command',
      ],
    });
    expect(file.commands.map((c) => c.id)).toEqual(['ok']);
  });

  it('treats a commands value that is not a list as no commands', () => {
    expect(readSettingsFile({ version: 1, commands: 'nope' }).commands).toEqual([]);
  });
});

describe('cleanSettingsPatch', () => {
  it('accepts guideSeen', () => {
    expect(cleanSettingsPatch({ guideSeen: true })).toEqual({ guideSeen: true });
  });

  it('keeps the known settings and drops any other key', () => {
    expect(cleanSettingsPatch({ fontSize: 14, sidebarHidden: true, bogus: 1 })).toEqual({
      fontSize: 14,
      sidebarHidden: true,
    });
  });

  it('refuses a known setting with the wrong type', () => {
    expect(() => cleanSettingsPatch({ commands: 'nope' })).toThrow(/commands/);
    expect(() => cleanSettingsPatch({ fontSize: '14' })).toThrow(/fontSize/);
    expect(() => cleanSettingsPatch({ sidebarWidth: Number.NaN })).toThrow(/sidebarWidth/);
    expect(() => cleanSettingsPatch({ sidebarHidden: 'yes' })).toThrow(/sidebarHidden/);
    expect(() => cleanSettingsPatch({ guideSeen: 1 })).toThrow(/guideSeen/);
    expect(() => cleanSettingsPatch({ cursorBlink: 'on' })).toThrow(/cursorBlink/);
  });

  it('accepts the cursor settings, and a text size from 9 to 28', () => {
    const patch = { cursorStyle: 'underline', cursorBlink: false, fontSize: 9 };
    expect(cleanSettingsPatch(patch)).toEqual(patch);
    expect(cleanSettingsPatch({ fontSize: 28 })).toEqual({ fontSize: 28 });
  });

  it('refuses a text size out of the range, or not whole, and a cursor style it does not know', () => {
    for (const fontSize of [8, 29, 13.5, Number.POSITIVE_INFINITY])
      expect(() => cleanSettingsPatch({ fontSize }), String(fontSize)).toThrow(/fontSize/);
    expect(() => cleanSettingsPatch({ cursorStyle: 'beam' })).toThrow(/cursorStyle/);
  });

  it('refuses an update that is not an object', () => {
    for (const patch of [null, 'x', 3, []]) expect(() => cleanSettingsPatch(patch)).toThrow();
  });

  it('accepts terminal titles, and refuses one with the wrong type', () => {
    const commands = [
      { id: 'a', name: 'Dev', terminals: [{ command: 'ls', title: 'List' }, { command: '' }] },
    ];
    expect(cleanSettingsPatch({ commands })).toEqual({ commands });
    const bad = [{ id: 'a', name: 'Dev', terminals: [{ command: 'ls', title: 7 }] }];
    expect(() => cleanSettingsPatch({ commands: bad })).toThrow(/commands/);
  });

  it('accepts saved commands whose shape is right, even if they break the rules', () => {
    const commands = [{ id: 'a', name: '', terminals: [] }];
    expect(cleanSettingsPatch({ commands })).toEqual({ commands });
  });
});
