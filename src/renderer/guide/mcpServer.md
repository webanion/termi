# The MCP server

Termi comes with an MCP server, so an AI assistant such as Claude Code can list, add and edit your saved commands. It changes the same settings file the app uses, and a running Termi shows the change straight away.

That cuts both ways. A saved command runs when you click it, and at every launch when auto-start is on. An assistant that reads untrusted text, such as a web page or an issue, can be talked into changing one. So keep its `add_saved_command` and `edit_saved_command` calls on manual approval, and read what it wants to save before you allow it.

How to add the server to your assistant is in the README, under MCP server.
