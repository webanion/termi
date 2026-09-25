# Termi

A terminal app for macOS with a warm dark theme, built with Electron, xterm.js, and node-pty.

- Reopens at the same window position and size. If that display is gone, the window moves to the main display.
- Custom header with the macOS traffic lights. Windows and Linux get drawn traffic lights.
- Sidebar with the running terminals at the top and your saved commands below.
- Saved commands can auto-start when Termi opens (the bolt icon).
- A saved command can run up to 4 terminals in one tab, for example an API server, a web server, and a plain shell
  for one project. Add them with "Add terminal" in the saved command dialog. An empty command opens a plain shell.
  When a tab has more than one terminal, a layout control shows on the right of the header. Termi remembers the
  layout for each saved command. Plain terminals always have one terminal per tab.
- Select text in a terminal to copy it. A double-click copies a word, and a triple-click copies a line.
- The sidebar footer shows CPU use, memory (RAM) use, and download and upload speed. Termi checks them every 1.5 seconds, and stops checking while the window is minimized.

## Run

```sh
npm install
npm run dev
```

`npm install` also rebuilds node-pty for Electron. `npm run dev` serves the window's code from a dev server that reloads when you save. `npm start` builds Termi into `out/` and runs that build.

Termi is written in TypeScript and built with electron-vite. Before you open a pull request, run:

```sh
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Build the app

```sh
npm run dist        # dmg and zip in _releases/<version>/
```

The logo is flat: one solid color, with no gradients or shadows. To change it, edit `assets/logo.svg`
(and `assets/logo-mark.svg`, which is the same logo without the outer padding), then run `npm run icons`.
It needs `rsvg-convert` (`brew install librsvg`).

## Shortcuts

| Keys | Action |
| --- | --- |
| ⌘T | New terminal |
| ⌘W | Close terminal |
| ⇧⌘N | New saved command |
| ⌘1 to ⌘9 | Go to terminal 1 to 9 |
| ⇧⌘[ and ⇧⌘] | Previous and next terminal |
| ⌘[ and ⌘] | Previous and next pane in a tab with more than one terminal |
| ⌘K | Clear the terminal |
| ⌘B | Show or hide the sidebar |
| ⌘+, ⌘-, ⌘0 | Text size |
| ⌘ click | Open a link |

Double-click a running terminal in the sidebar to rename it. In a tab with more than one terminal, ⌘W closes the
whole tab. To close one terminal, use the × in its pane header, or type `exit`.

## MCP server

`src/mcp/server.ts` is an MCP server for the saved commands. An AI assistant such as Claude Code can use it to list, add, and edit them. `npm run build` bundles it into `out/main/mcpServer.js`, which runs on plain Node over stdio and has no dependencies.

| Tool | What it does |
| --- | --- |
| `list_saved_commands` | Lists every saved command with its id, name, terminal commands, folder, auto-start, and layout |
| `add_saved_command` | Adds a saved command with 1 to 4 terminals |
| `edit_saved_command` | Changes a saved command, found by id or by name. Only the fields you give change |
| `get_termi_docs` | Returns the guide to the server. The same text is the `termi://docs` resource |

The guide is `src/mcp/docs.md`, and the build puts it inside the server. The server adds a reference to the end of it, built from the code: the layouts, every tool and parameter, and the paths this install uses. So the reference never goes out of date.

It follows the same rules as the saved command dialog. The first terminal needs a command, and a tab has at most 4
terminals. It writes to the same `settings.json` as the app. A running Termi watches that file, so a change shows in
the sidebar right away, and the name of a running tab follows a rename.

To add it to Claude Code for all your projects, build Termi once with `npm run build`, then:

```sh
claude mcp add termi --scope user -- node /path/to/termi/out/main/mcpServer.js
```

Set `TERMI_USER_DATA` to point the server (and the app) at another data folder, for example for tests.

## Where data is stored

`~/Library/Application Support/Termi/`:

- `window-state.json`: window position and size
- `settings.json`: saved commands (with their terminals and layout), sidebar width, text size
