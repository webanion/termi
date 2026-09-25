# Contributing

These are the working conventions for Termi. They are the same ones our other repositories follow, adapted to an app. A change that ignores them will be sent back.

Everyone taking part, in issues, pull requests and reviews, follows the [Code of Conduct](CODE_OF_CONDUCT.md).

Read the [README](../README.md) first, then [AGENTS.md](../AGENTS.md), which describes the code's layout and the rules that keep the page away from the shell. `AGENTS.md` and `CLAUDE.md` are instruction files for coding assistants: `AGENTS.md` is the format most tools read, and `CLAUDE.md` is the one Claude reads and points to `AGENTS.md`. Both double as the fastest description of how this repository expects to be worked on.

## Start with an issue

Work begins with a GitHub issue, not with a branch. The issue says what is wrong or missing, why it matters, and roughly what order the work should go in. The pull request that follows closes it.

Anything non-trivial gets a plan before it gets code. Understand the actual problem, read the existing code rather than assuming what it does, then write down what you propose to do and wait for agreement. A typo or a one line fix skips the plan, but still says what it is doing before doing it.

New here? Issues labelled `good first issue` are small and already scoped, and `help wanted` marks the ones the maintainers would like a hand with. Comment on the issue before starting, so two people do not do the same work.

If you find a second problem while working on the first, file it as its own issue. A finding mentioned only in a comment thread is lost once the thread scrolls. Finish what you are on, then write the finding up where it will be picked up again.

## Branches

Cut from a fresh `main` every time. Pull first, then branch. Without write access to the repository, fork it and branch in your fork, with the same names. CI runs on a pull request from a fork once a maintainer approves the run, which GitHub asks for on a first contribution.

```
<handle>/<type>/<kebab-title>
```

`<handle>` is your GitHub handle, shortened if it is long: `geniusmonir` branches as `gm`. Pick one form and keep using it. `<type>` is one of `feat`, `fix`, `refactor`, `chore`, `docs` or `test`. `<kebab-title>` is three to five words in kebab-case, as in `gm/fix/linux-idle-shell-busy`.

**Never force push to `main`, and never rewrite its history.** On your own branch, before anyone has reviewed it or built on it, rewrite freely. After that, stop. To bring a branch up to date, merge `main` into it rather than rebasing it.

## Commits

One line. [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), `<type>(<scope>): <description>`, with the type matching the branch prefix. Imperative mood, so "fix busy check" and not "fixed busy check". The scope is the area the change touches.

```
feat(sidebar): show the working folder of a saved command
fix(pty): compare the base name of the foreground program
chore(deps): bump node-pty from 1.1.0 to 1.1.1
```

There is no commit body. If a change needs explaining, the explanation belongs in the pull request, where it is read alongside the diff. The changelog is written from these lines at release time, so write the line for the person reading the changelog. CI refuses a subject that does not parse.

## Naming

- **camelCase** for variables, functions, and source and script file names.
- **PascalCase** for React component files, matching the component inside them.
- **kebab-case** for branch titles and image assets.
- **SCREAMING_SNAKE_CASE** for environment variables and constants.
- Config files keep the names their tools expect.

When a directory already does something else consistently, follow the directory.

## Versions and releases

Termi follows semantic versioning. Below 1.0 a breaking change bumps the minor version and anything else the patch. From 1.0 on, it is plain semver. Breaking means a user's existing setup stops working: a settings file that cannot be upgraded, an MCP tool removed or its contract changed, or a shortcut removed.

A feature pull request never changes the version. Releases are cut only by the Release workflow, which opens a release pull request with the version and the changelog, and tags and publishes when it is merged. Never tag or publish by hand.

## AI assistance, declared

Coding assistants are fine to use here. What is not fine is a reviewer being unable to tell.

**Say which assistant you used, in the pull request body.** One line, the tool and the model, for example `AI assistance: Claude Code, Opus 5`, or `AI assistance: none`. It changes nothing about how the change is reviewed. It tells whoever reads the diff what kind of mistakes to look for, which is a different set for generated code than for hand-written code. A pull request that does not say is assumed to have used one.

**A `Co-authored-by` trailer naming the model is welcome on the commit.** It puts the fact where the record lives. It does not replace the pull request line, since a trailer on one commit says nothing about the others. A "generated with" footer or any other tool advertisement does not belong in a commit message. The maintainers' own commits carry no trailer, by preference on their own history, so do not read the existing log as contradicting this. You are responsible for what you submit either way.

## Pull requests

Prefer one substantial pull request per issue, with one commit per step inside it, over a scatter of tiny ones.

The body is prose. Lead with why the change exists, then what it does, then how you know it works. Put `Closes #n` at the top when the pull request finishes an issue, and `Refs #n` when it moves one along.

- **Say which platform you verified on.** Contributors work on macOS and on Linux, and both are first-class. CI covers both, but it does not see what a person sees.
- **Anything a user sees needs a picture.** A screenshot for a static change, a short recording for anything with motion or more than one step. Before and after, when there was a before.
- **Show how it was verified.** The command you ran and what it returned, or the case that used to fail and now does not. "CI is green" on its own is not verification.
- **Write for someone who cannot see your machine.** No absolute paths from your disk, and no shorthand that exists nowhere in the repository.

Pull requests are merged with a merge commit, never squashed or rebased.

## Tests and CI

A change ships with its tests in the same pull request. A module gets unit tests, and a bug fix gets the case that used to fail. Test effort follows risk: the settings file, the IPC boundary, the MCP server and anything that starts or stops a shell get the thorough treatment.

| Layer | Command | Where |
| --- | --- | --- |
| Unit | `npm test` | `tests/unit/`, with Vitest, in Node, and in jsdom for the renderer |
| Integration | `npm run test:integration` | `tests/integration/`: the built MCP server over stdio, and real shells |
| End to end | `npm run smoke` | `tests/e2e/`: the built app through Playwright's Electron driver |
| Scripts | `npm run test:scripts` | `scripts/*.test.mjs`, with `node --test` |

Every test uses a temporary `TERMI_USER_DATA`, never real settings. CI runs lint, typecheck, format, every test layer and the build on Linux and on macOS. Red CI means no merge. A skipped test needs a linked issue that says when it comes back.

Gate on exit codes, never on matched output. A chain like `run-tests | grep passed && git push` reports success whenever grep finds its line, failing or not.

## Documentation moves with the code

If a change makes a document wrong, fix the document in the same pull request, whether that is the README, `AGENTS.md`, `src/mcp/docs.md` or this file. No follow-up issue for it.

## Scripts that change data

Any script that writes, deletes, migrates or backfills reports what it would do by default, and acts only when passed `--execute`. Not `--write`, `--apply`, `--commit` or `--yes`. Its header comment states the flag, and it names the target before reporting anything about it.

## How things are written

These rules apply to documentation, commit messages, issues, pull requests and code comments.

**Never an em dash.** A comma replaces it, or a full stop where it was holding two sentences apart. Not a hyphen: a hyphen joins words. The en dash stays only where it means "to" or "between", as in a range of years. CI fails on an em dash in any tracked file.

**Never hard wrap markdown.** One paragraph is one line, however long. No manual line breaks inside a paragraph, a list item, a table cell or a blockquote. These files are read in a viewer that wraps on its own.

Beyond those two: no decorative comments in code, no narration of what the next line obviously does, and no assistant register in prose. Engineer to engineer, and dense.

## Secrets

No secrets in git, ever. Real credentials live in a secret store, never in the repository, a pull request, an issue, a screenshot or a pasted log. CI fails on a committed env file.

## Ask before you do these

- Force push or rewrite history on a shared branch, and never on `main` at all.
- `--no-verify` on anything.
- Run the Release workflow, or push or delete tags.
- Change the CI or release workflows.
- Add a dependency.
- Add an IPC channel or an MCP tool, or widen what an existing one accepts.
- Change anything that touches `webPreferences`, the CSP, or how links and navigation are handled.

A yes takes one message. Undoing any of these takes considerably longer.

## License

Termi is under the [MIT license](../LICENSE). A contribution is accepted under the same license, and opening a pull request means you have the right to offer it on those terms.

## Questions

Open an issue. Security reports take the private route instead, see [SECURITY](SECURITY.md).
