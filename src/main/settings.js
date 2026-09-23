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

function getSettings() {
  if (!cache) {
    cache = { ...DEFAULTS, ...readJson(settingsFile(), {}) };
    cache.commands = cache.commands.map(upgradeCommand);
  }
  return cache;
}

// Merge a partial update into the settings and save them to disk.
function updateSettings(patch) {
  const allowed = Object.keys(DEFAULTS);
  const clean = Object.fromEntries(Object.entries(patch || {}).filter(([key]) => allowed.includes(key)));
  cache = { ...getSettings(), ...clean };
  writeJson(settingsFile(), cache);
  return cache;
}

module.exports = { getSettings, updateSettings };
