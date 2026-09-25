// The settings file, settings.json, which the app and the MCP server both read and write.

import { isRecord, isSavedCommandShape } from './savedCommands';
import type { SavedCommand, Settings, StoredCommand } from './types';

// Bump this and add a step to MIGRATIONS whenever the shape of the file changes.
export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  commands: [],
  sidebarWidth: 232,
  sidebarHidden: false,
  fontSize: 13,
};

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
};

// Turn whatever settings.json held into current settings. An older file is migrated one
// version at a time, missing settings get their defaults, and a broken file gives the defaults.
// A saved command without the shape of one is left out.
export function readSettingsFile(raw: unknown): SettingsFile {
  const file: Record<string, unknown> = isRecord(raw) ? { ...raw } : {};
  let version = typeof file.version === 'number' ? file.version : 0;
  while (version < SETTINGS_VERSION) {
    MIGRATIONS[version]?.(file);
    version += 1;
  }
  const commands = Array.isArray(file.commands) ? file.commands.filter(isSavedCommandShape) : [];
  return { ...DEFAULT_SETTINGS, ...file, commands, version };
}

// The settings the renderer may change, each with a check of its value's type.
const PATCH_CHECKS: { [K in keyof Settings]: (value: unknown) => boolean } = {
  commands: (value) => Array.isArray(value) && value.every(isSavedCommandShape),
  sidebarWidth: (value) => typeof value === 'number' && Number.isFinite(value),
  sidebarHidden: (value) => typeof value === 'boolean',
  fontSize: (value) => typeof value === 'number' && Number.isFinite(value),
};

// Keep the known settings from an update and drop any other key. Throw when a known setting
// has the wrong type, which only a bug or a hostile page would send.
export function cleanSettingsPatch(patch: unknown): Partial<Settings> {
  if (!isRecord(patch)) throw new TypeError('A settings update must be an object.');
  const clean: Record<string, unknown> = {};
  for (const [key, check] of Object.entries(PATCH_CHECKS)) {
    if (!(key in patch)) continue;
    if (!check(patch[key])) throw new TypeError(`The setting "${key}" has the wrong type.`);
    clean[key] = patch[key];
  }
  return clean as Partial<Settings>;
}
