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
npm start
```

`npm install` also rebuilds node-pty for Electron.

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

## Where data is stored

`~/Library/Application Support/Termi/`:

- `window-state.json`: window position and size
- `settings.json`: saved commands (with their terminals and layout), sidebar width, text size
