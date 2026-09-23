const path = require('path');
const { app } = require('electron');
const { readJson, writeJson } = require('./json-file');

const DEFAULTS = {
  // Saved commands: { id, name, command, cwd, autoStart }
  commands: [],
  sidebarWidth: 232,
  sidebarHidden: false,
  fontSize: 13,
};

let cache = null;

function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function getSettings() {
  if (!cache) cache = { ...DEFAULTS, ...readJson(settingsFile(), {}) };
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
