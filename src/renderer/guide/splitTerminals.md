# Split terminals

A tab can hold up to 4 terminals side by side, for example an API server, a web server and a shell for the same project.

- Split any tab with {split-terminal}, or the split button on the right of the header. It adds a plain shell, in the folder the tab started in.
- A saved command can open several terminals at once. In the saved command dialog, choose Add terminal for each one. The first terminal needs a command, and an empty one after it opens a plain shell.
- When a tab has more than one terminal, the layout control on the right of the header arranges them. Termi remembers the layout for each saved command, but a split is not saved to it. The saved command dialog sets the layout too, under Layout.
- Drag the line between two terminals to resize them, and double-click the line to make them equal again. A line that has keyboard focus also moves with the arrow keys. The sizes last while the tab runs, and go back to equal when you choose another layout, split the tab or close one of its terminals.
- Move between the terminals of a tab with {prev-pane} and {next-pane}, or with a click.
- Close one terminal with the × in its header. Closing the tab closes all of them.
