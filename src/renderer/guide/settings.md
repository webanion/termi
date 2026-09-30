# Settings

Open the settings with {open-settings}, or with the gear at the top of the sidebar. On macOS they are also under Termi > Settings, and on Linux under Edit > Settings.

- Every change applies at once, to every terminal, and Termi saves it. There is no Save button.
- Each setting shows its default. The arrow next to a changed setting puts the default back, and Reset all puts back every one.
- General has whether the sidebar shows and, on macOS, whether Termi opens when you log in.
- Terminal has the text size, from 9 to 28, the shape of the cursor (a bar, a block or an underline), whether it blinks, and smooth scrolling. With smooth scrolling on, a mouse wheel scrolls the lines in a short animation. A trackpad always scrolls as your fingers move.

The settings live in `settings.json`, with the saved commands. If you edit that file while Termi runs, Termi applies the change, and the settings show it. A value Termi cannot use goes back to its default.
