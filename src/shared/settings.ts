// The settings file, settings.json, which the app and the MCP server both read and write.

import { isRecord, isSavedCommandShape } from './savedCommands';
import type { CursorStyle, SavedCommand, Settings, StoredCommand } from './types';

// Bump this and add a step to MIGRATIONS whenever the shape of the file changes.
export const SETTINGS_VERSION = 5;

export const DEFAULT_SETTINGS: Settings = {
  commands: [],
  sidebarWidth: 232,
  sidebarHidden: false,
  fontSize: 13,
  cursorStyle: 'bar',
  cursorBlink: true,
  guideSeen: false,
};

export const FONT_SIZE_MIN = 9;
export const FONT_SIZE_MAX = 28;

export const CURSOR_STYLES: CursorStyle[] = ['bar', 'block', 'underline'];

// A text size in the range, as a whole number.
export function clampFontSize(size: number): number {
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)));
}

// The file as written: the settings, its version, and any keys this build does not know,
// which are kept so that settings a newer build wrote survive a save by an older one.
export type SettingsFile = Settings & { version: number } & Record<string, unknown>;

// A saved command used to have one `command`. Now it has a list of up to 4 terminals.
function upgradeCommand(cmd: StoredCommand): SavedCommand {
  if (Array.isArray(cmd.terminals)) return cmd as SavedCommand;
  const { command = '', ...rest } = cmd;
  return { ...rest, terminals: [{ command }] };
}

// Each step takes a file of that version to the next one.
const MIGRATIONS: Record<number, (file: Record<string, unknown>) => void> = {
  // Version 0 had no version number, and a saved command could have one `command`.
  0: (file) => {
    if (Array.isArray(file.commands))
      file.commands = (file.commands as StoredCommand[]).map(upgradeCommand);
  },
  // Version 2 added guideSeen. Someone upgrading from version 1 has not seen the guide.
  1: (file) => {
    if (typeof file.guideSeen !== 'boolean') file.guideSeen = false;
  },
  // Version 3 added an optional title to each terminal. An older file has none, and needs none.
  2: () => {},
  // Version 4 added an optional view to each saved command. An older one has none, so it splits.
  3: () => {},
  // Version 5 added the cursor style and whether it blinks. An older file gets the defaults,
  // which are how the cursor looked before.
  4: () => {},
};

// The settings the renderer may change, each with a check of its value.
const PATCH_CHECKS: { [K in keyof Settings]: (value: unknown) => boolean } = {
  commands: (value) => Array.isArray(value) && value.every(isSavedCommandShape),
  sidebarWidth: (value) => typeof value === 'number' && Number.isFinite(value),
  sidebarHidden: (value) => typeof value === 'boolean',
  fontSize: (value) =>
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= FONT_SIZE_MIN &&
    value <= FONT_SIZE_MAX,
  cursorStyle: (value) => CURSOR_STYLES.includes(value as CursorStyle),
  cursorBlink: (value) => typeof value === 'boolean',
  guideSeen: (value) => typeof value === 'boolean',
};

// Turn whatever settings.json held into current settings. An older file is migrated one
// version at a time, missing settings get their defaults, and a broken file gives the defaults.
// A saved command without the shape of one is left out. A setting edited by hand to a value the
// app cannot use gets its default, and a text size out of the range the nearest size in it.
export function readSettingsFile(raw: unknown): SettingsFile {
  const file: Record<string, unknown> = isRecord(raw) ? { ...raw } : {};
  let version = typeof file.version === 'number' ? file.version : 0;
  while (version < SETTINGS_VERSION) {
    MIGRATIONS[version]?.(file);
    version += 1;
  }
  if (typeof file.fontSize === 'number' && Number.isFinite(file.fontSize))
    file.fontSize = clampFontSize(file.fontSize);
  for (const [key, check] of Object.entries(PATCH_CHECKS)) {
    if (key !== 'commands' && key in file && !check(file[key])) delete file[key];
  }
  const commands = Array.isArray(file.commands) ? file.commands.filter(isSavedCommandShape) : [];
  return { ...DEFAULT_SETTINGS, ...file, commands, version };
}

// Keep the known settings from an update and drop any other key. Throw when a known setting
// has the wrong type or is out of its range, which only a bug or a hostile page would send.
export function cleanSettingsPatch(patch: unknown): Partial<Settings> {
  if (!isRecord(patch)) throw new TypeError('A settings update must be an object.');
  const clean: Record<string, unknown> = {};
  for (const [key, check] of Object.entries(PATCH_CHECKS)) {
    if (!(key in patch)) continue;
    if (!check(patch[key])) throw new TypeError(`The setting "${key}" has a wrong value.`);
    clean[key] = patch[key];
  }
  return clean as Partial<Settings>;
}
