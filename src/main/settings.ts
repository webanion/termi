import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { readJson, writeJson } from './jsonFile';
import type { SavedCommand, Settings, StoredCommand } from '../shared/types';

type StoredSettings = Omit<Settings, 'commands'> & { commands: StoredCommand[] };

const DEFAULTS: Settings = {
  // Saved commands: { id, name, terminals: [{ command }], cwd, autoStart, layout }
  commands: [],
  sidebarWidth: 232,
  sidebarHidden: false,
  fontSize: 13,
};

let cache: Settings | null = null;

// A saved command used to have one `command`. Now it has a list of up to 4 terminals.
function upgradeCommand(cmd: StoredCommand): SavedCommand {
  if (Array.isArray(cmd.terminals)) return cmd as SavedCommand;
  const { command = '', ...rest } = cmd;
  return { ...rest, terminals: [{ command }] };
}

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings(): Settings {
  const stored: StoredSettings = {
    ...DEFAULTS,
    ...readJson<Partial<StoredSettings>>(settingsFile(), {}),
  };
  return { ...stored, commands: stored.commands.map(upgradeCommand) };
}

export function getSettings(): Settings {
  if (!cache) cache = loadSettings();
  return cache;
}

// Merge a partial update into the settings and save them to disk.
// Start from the file, not the cache, so a change from the MCP server is not lost.
export function updateSettings(patch: Partial<Settings> | null | undefined): Settings {
  const allowed = Object.keys(DEFAULTS);
  const clean = Object.fromEntries(
    Object.entries(patch || {}).filter(([key]) => allowed.includes(key)),
  ) as Partial<Settings>;
  cache = { ...loadSettings(), ...clean };
  writeJson(settingsFile(), cache);
  return cache;
}

// Call onChange with the new settings when another program (the MCP server) changes the file.
// Watch the folder, because each write replaces the file with a new one.
export function watchSettings(onChange: (settings: Settings) => void): void {
  const file = settingsFile();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    fs.watch(path.dirname(file), (_event, name) => {
      if (name !== path.basename(file)) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = loadSettings();
        if (JSON.stringify(next) === JSON.stringify(getSettings())) return;
        cache = next;
        onChange(cache);
      }, 100);
    });
  } catch {
    // Without a watcher, outside changes show after the next start.
  }
}
