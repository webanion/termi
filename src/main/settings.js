const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { readJson, writeJson } = require('./json-file');

const DEFAULTS = {
  // Saved commands: { id, name, terminals: [{ command }], cwd, autoStart, layout }
  commands: [],
  sidebarWidth: 232,
  sidebarHidden: false,
  fontSize: 13,
};

let cache = null;

// A saved command used to have one `command`. Now it has a list of up to 4 terminals.
function upgradeCommand(cmd) {
  if (Array.isArray(cmd.terminals)) return cmd;
  const { command = '', ...rest } = cmd;
  return { ...rest, terminals: [{ command }] };
}

function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  const settings = { ...DEFAULTS, ...readJson(settingsFile(), {}) };
  settings.commands = settings.commands.map(upgradeCommand);
  return settings;
}

function getSettings() {
  if (!cache) cache = loadSettings();
  return cache;
}

// Merge a partial update into the settings and save them to disk.
// Start from the file, not the cache, so a change from the MCP server is not lost.
function updateSettings(patch) {
  const allowed = Object.keys(DEFAULTS);
  const clean = Object.fromEntries(Object.entries(patch || {}).filter(([key]) => allowed.includes(key)));
  cache = { ...loadSettings(), ...clean };
  writeJson(settingsFile(), cache);
  return cache;
}

// Call onChange with the new settings when another program (the MCP server) changes the file.
// Watch the folder, because each write replaces the file with a new one.
function watchSettings(onChange) {
  const file = settingsFile();
  let timer = null;
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

module.exports = { getSettings, updateSettings, watchSettings };
