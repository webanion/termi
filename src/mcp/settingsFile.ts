import os from 'os';
import path from 'path';
import { readJson, writeJson } from '../main/jsonFile';
import { readSettingsFile, type SettingsFile } from '../shared/settings';

// The same folder Electron uses for app.getPath('userData') with the app name "Termi".
function userDataDir(): string {
  if (process.env.TERMI_USER_DATA) return process.env.TERMI_USER_DATA;
  const home = os.homedir();
  if (process.platform === 'darwin')
    return path.join(home, 'Library', 'Application Support', 'Termi');
  if (process.platform === 'win32')
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Termi');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Termi');
}

export const SETTINGS_FILE = path.join(userDataDir(), 'settings.json');

export function readSettings(): SettingsFile {
  return readSettingsFile(readJson<unknown>(SETTINGS_FILE, null));
}

export function writeSettings(settings: SettingsFile): void {
  writeJson(SETTINGS_FILE, settings);
}
