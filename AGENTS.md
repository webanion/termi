# AGENTS.md

How to work on Termi. Coding assistants read this file first, and it is the quickest orientation for people too. `CLAUDE.md` points here.

Termi is an Electron terminal app: xterm.js in the window, shells through node-pty in the main process, and an MCP server that manages saved commands. Contributors work on macOS and Linux, and both are first-class.

## Layout

| Path | What lives there |
| --- | --- |
| `src/main/` | The main process. `main.ts` is the app lifecycle, `window.ts` the window and its navigation rules, `menu.ts` the menu, `ipc.ts` every IPC handler with its sender and input checks, `ptyManager.ts` the shells, `settings.ts` the settings store, plus `windowState.ts`, `systemStats.ts` and `jsonFile.ts`. |
| `src/preload/` | `preload.ts` builds `window.termi` from the channels in `src/shared/ipc.ts`. |
| `src/renderer/` | The window's page. It moves to React in #11. |
| `src/mcp/` | The MCP server. `server.ts` is the entry and dispatch, `jsonRpc.ts` the stdio transport, `tools.ts` the tools, `docs.ts` and `docs.md` the guide, `settingsFile.ts` where it finds the settings. |
| `src/shared/` | Code every process loads: `types.ts`, `ipc.ts` (the IPC contract), `settings.ts` (the settings file's schema, version, migrations and update checks), `savedCommands.ts` (the saved command rules) and `layouts.ts`. |
| `scripts/` | Build helpers, such as `buildIcons.sh`. |
| `assets/` | Logo sources and icons, also used by electron-builder. |
| `out/` | Build output, not tracked. |

## Process boundaries

These rules are what keep a page that shows untrusted terminal output from reaching the shell or the disk.

- The renderer runs sandboxed with context isolation and reaches main only through `window.termi`. Never turn on `nodeIntegration`, turn off `sandbox` or `contextIsolation`, loosen the CSP in `index.html`, or expose `ipcRenderer` to the page.
- Every IPC channel is declared in `src/shared/ipc.ts`. A new channel goes there first, then gets its handler in `src/main/ipc.ts` and its method in the preload. The types make a mismatch fail the typecheck.
- Main treats what the renderer sends as untrusted. `src/main/ipc.ts` checks that the sender is the app's own page and validates every argument before using it.
- Text from a terminal (titles, OSC sequences, process names) and from settings goes into the page as text, never as HTML.
- `src/shared/` imports neither Node nor Electron, because the sandboxed renderer loads it. `src/mcp/` never imports Electron, because it runs under plain Node. ESLint enforces both.
- When the shape of `settings.json` changes, bump `SETTINGS_VERSION` in `src/shared/settings.ts` and add a migration step. Keys a build does not know are kept, so an older build does not destroy a newer build's settings.

## Commands

| Command | What it does |
| --- | --- |
| `npm ci` | Install, and rebuild node-pty for Electron. |
| `npm run dev` | Run Termi with the page on a dev server that reloads on save. |
| `npm start` | Build into `out/` and run the build. |
| `npm run build` | Build main, preload, renderer and the MCP server into `out/`. |
| `npm run typecheck` | TypeScript for both projects, node (`tsconfig.node.json`) and web (`tsconfig.web.json`). |
| `npm run lint` | ESLint, including the import rules above. |
| `npm run format:check` | Prettier. `npm run format` fixes it. |
| `npm run dist` | Build and package the macOS app. |
| `node out/main/mcpServer.js` | The MCP server, after a build. |

`TERMI_USER_DATA` points the app and the MCP server at another data folder. Use a temporary one for any test, so real settings are never touched.

## Before a pull request

`typecheck`, `lint`, `format:check` and `build` pass. Then run the app, in development and as a build, and say in the pull request what you checked and on which platform, macOS or Linux. The test suite arrives with #4.

## Conventions

- Branches `<handle>/<type>/<kebab-title>`, cut from a fresh `main`, with the type one of `feat`, `fix`, `refactor`, `chore`, `docs` or `test`.
- One-line Conventional Commits, `type(scope): description`, with the type matching the branch.
- Pull requests merge with a merge commit. Never force push, and never rewrite `main`.
- Source files and scripts are named in camelCase, React component files in PascalCase. Image assets keep kebab-case names, and config files keep the names their tools expect.
- Documentation moves with the code: if a change makes the README or `src/mcp/docs.md` wrong, fix it in the same pull request.
- Never use an em dash in any text, and never hard wrap markdown. One paragraph is one line.
- If you used a coding assistant, say which one in the pull request body. A `Co-authored-by` trailer naming the model is welcome on commits, and "generated with" footers are not. The maintainers' own commits carry no trailer.

## Ask first

- Running a release, or pushing or deleting tags.
- Adding a dependency.
- Adding an IPC channel or an MCP tool, or widening what an existing one accepts.
- Anything that touches `webPreferences`, the CSP, or how links and navigation are handled.

## Known platform issues

- On Linux, every idle shell counts as busy (#9), so closing the window asks for confirmation and a scripted close does not exit. In automated runs, stop Termi by killing its shells and then its main process, by pid.
- On Ubuntu 23.10 and later, the development Electron needs an AppArmor profile to start its sandbox outside VS Code (#8).
