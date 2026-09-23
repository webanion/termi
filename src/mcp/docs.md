# Termi MCP server

Termi is the user's own terminal app for macOS (Electron, xterm.js, node-pty). The source is in this repository.
This MCP server lets an assistant list, add, and edit Termi's **saved commands**.

## Saved commands

A saved command is an entry in the lower part of the Termi sidebar. Clicking it opens one tab. The tab has 1 to 4
terminals, and each terminal runs its own shell command. Clicking a saved command that is already running focuses
its tab instead of starting it again.

Each saved command has these fields:

| Field | Meaning |
| --- | --- |
| `id` | A short random id, such as `3t9tupws`. The server makes it. It never changes. |
| `name` | The name in the sidebar and on the tab. |
| `terminals` | One command string per terminal, 1 to 4 items. A command can have more than one line. |
| `cwd` | The folder all terminals start in. Empty means the home folder. `~` works. |
| `autoStart` | When true, the command starts when Termi opens (the bolt icon in the sidebar). |
| `layout` | How a tab with 2 to 4 terminals is split. See "Layouts" below. It is not set for 1 terminal. |

## Rules

The server uses the same rules as the saved command dialog in the app:

- The name must not be empty.
- There must be 1 to 4 terminals.
- The first terminal must have a command. A later terminal can be an empty string, which opens a plain shell.
- A layout must be one of the ids for that number of terminals.
- Spaces at the start and end of the name, the folder, and each command are removed.

A tool that breaks a rule returns an error that says what to fix. Nothing is saved in that case.

## How edits work

- `edit_saved_command` finds the command by `target`: its id first, then its exact name (not case-sensitive). If two
  commands have the same name, use the id.
- Only the fields you pass change.
- `terminals` replaces the whole list. To add a terminal to a command, pass the old commands plus the new one. Call
  `list_saved_commands` first to get the old list.
- An empty `layout` string removes the layout, so the app uses the default one.
- If the number of terminals changes and the saved layout does not fit the new number, the server removes it.

## How changes reach the app

The server reads and writes Termi's `settings.json` (the path is in "This install" below). The app keeps its own
settings in that file too (sidebar width, text size), and the server never changes them.

A running Termi watches the file. After a change from this server:

- the sidebar shows the new or changed command right away;
- a running tab of a renamed command takes the new name;
- a change to the terminals, folder, or layout applies the next time the command starts. A running tab keeps its
  terminals.

The watcher is in the app source (`src/main/settings.js`). A packaged build made before the MCP server was added
does not have it. That build shows changes only after a restart, and its next save can overwrite them. Rebuild it
with `npm run dist`.

## What the server cannot do

- Delete a saved command. The user can do it in the app: the edit (pencil) button on the command, then "Delete",
  clicked twice.
- Start or stop a command, or open, close, or type into terminals.
- Change other settings, such as text size or sidebar width.

## Common tasks

Add a project with an API server, a web server, and a spare shell:

```json
{ "name": "Shop", "terminals": ["npm run api", "npm run web", ""], "cwd": "~/Workshop/shop", "layout": "main-left" }
```

Rename a command: `{ "target": "Shop", "name": "Shop dev" }`

Turn on auto-start: `{ "target": "Shop", "autoStart": true }`

Add a fourth terminal: list first, then `{ "target": "Shop", "terminals": ["npm run api", "npm run web", "", "npm test -- --watch"] }`

## Setup and problems

- Source: `src/mcp/server.js` (the server) and `src/mcp/docs.md` (this guide). Plain Node, no dependencies.
- Register it with Claude Code for all projects:
  `claude mcp add termi --scope user -- node /path/to/termi/src/mcp/server.js`
- Check it: `claude mcp get termi`. A new server or a change to the server needs a new Claude Code session.
- Set `TERMI_USER_DATA` to use another data folder, for example for tests. The app reads the same variable.
- Test it by hand. Each line on stdin is one JSON-RPC message:
  `echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_saved_commands","arguments":{}}}' | node src/mcp/server.js`
