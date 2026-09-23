const fs = require('fs');
const path = require('path');

// Read a JSON file. Return the fallback when the file is missing or broken.
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// Write through a temp file and rename it, so a crash never leaves half a file.
// The temp name has the process id, because the app and the MCP server can write the same file.
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

module.exports = { readJson, writeJson };
