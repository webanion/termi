import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { readJson, writeJson } from './jsonFile';
import { readSettingsFile, type SettingsFile } from '../shared/settings';
import type { Settings } from '../shared/types';

let cache: SettingsFile | null = null;

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings(): SettingsFile {
  return readSettingsFile(readJson<unknown>(settingsFile(), null));
}

export function getSettings(): Settings {
  if (!cache) cache = loadSettings();
  return cache;
}

// Merge an update into the settings and save them to disk. The update has been checked by the
// IPC handler. Start from the file, not the cache, so a change from the MCP server is not lost.
export function updateSettings(patch: Partial<Settings>): Settings {
  cache = { ...loadSettings(), ...patch };
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
