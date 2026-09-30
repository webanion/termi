# Terminals and tabs

Every terminal Termi runs is listed under Running in the sidebar. A plain terminal is one shell, in a tab of its own, until you split it.

- Open one with {new-terminal}, or the + next to Running. Or drop a folder from Finder or your file manager on the sidebar to open a terminal in that folder. A dropped file opens one in the folder it is in, and one drop opens up to 4.
- Switch to one with a click in the sidebar, or with {select-terminal-0} to {select-terminal-8}. Step through them with {prev-terminal} and {next-terminal}.
- Rename one by double-clicking its name in the sidebar. Enter keeps the new name, and Escape drops it.
- Close one with {close-terminal}, or type `exit`. If a program is still running in any terminal when you quit, Termi asks first.

Drop files or folders on a terminal to type their paths, quoted for the shell. Nothing runs until you press Enter. In a split tab, the paths go to the terminal under the pointer. Tools like Claude Code attach a dropped image this way.

Long lines wrap at the edge of the terminal. To keep them on one line, as for wide logs or tables, turn word wrap off with {toggle-word-wrap}. The terminal then scrolls sideways with a sideways swipe, Shift and the mouse wheel, or the scrollbar below it, and it follows the cursor while you type. A full-screen program such as vim gets the terminal's width while it runs. The same keys turn wrap back on, and the setting Wrap long lines decides how a new terminal starts.

The dot next to a terminal lights up when it prints something while you are looking at another one.
