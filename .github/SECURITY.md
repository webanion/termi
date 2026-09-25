# Security

## Reporting a vulnerability

Report it privately through GitHub: on the repository's **Security** tab, choose **Report a vulnerability**, or go straight to [the form](https://github.com/webanion/termi/security/advisories/new). Only you and the maintainers, Jawad Ahbab ([@JawadAhbab](https://github.com/JawadAhbab)) and Md. Moniruzzaman ([@geniusmonir](https://github.com/geniusmonir)), can see the report. Do not open an issue, and do not put the details in a pull request or a discussion.

A useful report says which version, on which platform, what you found, what an attacker could do with it, and enough detail to reproduce it. A proof of concept helps. If you are not sure whether something is a real issue, send it anyway and say so.

## What to expect

We acknowledge a report within a few working days. After that you get an assessment of whether it is a vulnerability, how serious we think it is, and what we intend to do, and we tell you when a fixed version is released. The fix is worked on in the advisory's private fork and ships as a new release. Once it is out, never before, the advisory is published, with a CVE when the issue warrants one, and the changelog names the class of vulnerability. The advisory credits you unless you ask it not to.

Only the latest release is supported.

## Scope

Termi runs a shell with the user's full rights, and its window shows whatever that shell prints. So the line that matters is between content, which anything can control, and the privileged bridge the page uses to start shells, write to them and change settings. Report anything that crosses it:

- Content from a terminal reaching the page as markup instead of text: a title set by an escape sequence, a program's name, output, or a saved command's name or command.
- A way around context isolation or the sandbox, or the page reaching Node or Electron.
- The page navigating, or opening a window, anywhere other than its own page, or `window.open` reaching a scheme other than http or https.
- An IPC message that main accepts from something other than the app's own page, or with arguments it should have refused.
- A change through the MCP server or to `settings.json` that runs a command the user did not see or approve.
- A compromise of the build, the release workflow or a dependency that ends up in what users install.

Out of scope: a command a user types, or saves themselves and then runs. A terminal runs what it is told to.

When you are testing, use a temporary data folder with `TERMI_USER_DATA`, stay off machines you do not own, and stop once you have shown the issue rather than exploring what else it opens.

## Credentials

If you find a live credential, key or token committed anywhere in this repository, treat it as a vulnerability and report it privately. Say where you saw it and nothing more, and do not test whether it still works.
