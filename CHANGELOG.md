# Changelog

Every release of Termi, newest first. Each section is written by `scripts/changelog.mjs` from the Conventional Commits since the release before it, and is that version's GitHub Release notes.

## v0.1.0 (2026-09-25)

### Features

- **docs:** describe the in-app help, its shortcuts and the guideSeen setting ([d519088](https://github.com/webanion/termi/commit/d51908860ad9a349ef430ab2b52c98e30b56b55a), [#31](https://github.com/webanion/termi/pull/31))
- **help:** add the guide, the shortcut sheet, the command palette and Report an Issue ([5bb2ee9](https://github.com/webanion/termi/commit/5bb2ee9c7ee0e7a5476ef1c4ffd6b0b33834b560), [#31](https://github.com/webanion/termi/pull/31))
- **menu:** name every action in one list, and add a Help menu ([f066380](https://github.com/webanion/termi/commit/f066380142b0f20b66a1f894e8ea9b42278c397b), [#31](https://github.com/webanion/termi/pull/31))
- add MCP server for saved commands ([34592c6](https://github.com/webanion/termi/commit/34592c6f78b57a5bf09241199d3762351662857d))
- add split terminals to saved commands ([0c947c0](https://github.com/webanion/termi/commit/0c947c0ad8a29c59c8987dd7030b9d47f356c6f8))
- add Termi terminal app ([1965bf8](https://github.com/webanion/termi/commit/1965bf8b80b0ce8f0b1a93e57b1e1354ed660c5b))

### Fixes

- **linux:** name the desktop entry after the app id, so the dock shows Termi's icon ([42b037a](https://github.com/webanion/termi/commit/42b037a0da135926abefb2a34a27328a22571d55), [#33](https://github.com/webanion/termi/pull/33))
- **pty:** learn the shell's name while it has its terminal, whatever $SHELL started ([1a563f3](https://github.com/webanion/termi/commit/1a563f308cdb1f76d6401d23f5ce570eff88963e), [#30](https://github.com/webanion/termi/pull/30))
- **e2e:** leave xterm's idle task timing notice out of the page's problems ([497ab61](https://github.com/webanion/termi/commit/497ab615ad4d8689f92b21bbb04952c88ba7c343), [#28](https://github.com/webanion/termi/pull/28))
- **dev:** download Electron on install, which its package no longer does ([d116756](https://github.com/webanion/termi/commit/d116756ecc477d2254d5b06f4a0ce80b65344b48), [#28](https://github.com/webanion/termi/pull/28))
- **e2e:** press the Linux shortcut keys through Electron's input, which main sees ([1c8c790](https://github.com/webanion/termi/commit/1c8c79057e0b057bbc2d1b70c72c3b6eb6319fe7), [#28](https://github.com/webanion/termi/pull/28))
- **docs:** describe the Linux shortcuts, window controls and AppArmor script ([0cecf99](https://github.com/webanion/termi/commit/0cecf99aaa9f3cc7e55ed189e7a30344b0189715), [#28](https://github.com/webanion/termi/pull/28))
- **renderer:** label shortcuts with the keys of the platform ([79a8b40](https://github.com/webanion/termi/commit/79a8b4064d33723492311a5b69dba647cf914d74), [#28](https://github.com/webanion/termi/pull/28))
- **shortcuts:** take Linux shortcuts before the terminal sees them ([6ee38ff](https://github.com/webanion/termi/commit/6ee38ffa6ae86b0c6f5e71ec145996e63cfdb65e), [#28](https://github.com/webanion/termi/pull/28))
- **shortcuts:** keep every shortcut in one table for macOS and Linux ([1ff5dc5](https://github.com/webanion/termi/commit/1ff5dc5416a26fef0b6a5a01e6e169fbb7cf3e5b), [#28](https://github.com/webanion/termi/pull/28))
- **theme:** add the common Linux monospace fonts to the font stacks ([e500248](https://github.com/webanion/termi/commit/e500248329e7e79a5fa920bf8c9da430c29439f8), [#28](https://github.com/webanion/termi/pull/28))
- **header:** leave a header double-click to the system outside macOS ([fd3acf4](https://github.com/webanion/termi/commit/fd3acf4a99bde5f977e94301e96d2e7fad2b96d2), [#28](https://github.com/webanion/termi/pull/28))
- **window:** use the system's window controls on Linux ([1c02166](https://github.com/webanion/termi/commit/1c021669321ada4fdfd40ea656741d1a4904ee1d), [#28](https://github.com/webanion/termi/pull/28))
- **dev:** add a script that installs an AppArmor profile for the development Electron ([1258d3e](https://github.com/webanion/termi/commit/1258d3eed37ef43310109b5023068ffbdee27883), [#28](https://github.com/webanion/termi/pull/28))
- **icons:** write the PNGs and skip the icns where iconutil is missing ([e5870ab](https://github.com/webanion/termi/commit/e5870ab6dbde3dbd694acd0165dab6b9134727ad), [#28](https://github.com/webanion/termi/pull/28))
- **pty:** leave out what npm and electron-vite add to the shell environment ([a3ce1ba](https://github.com/webanion/termi/commit/a3ce1ba32fe03cca7903e84008a734ab1adbd0cf), [#28](https://github.com/webanion/termi/pull/28))
- **main:** compare the base name of the foreground program with the shell ([574a605](https://github.com/webanion/termi/commit/574a605424976638cca0744211e208794a247f71), [#13](https://github.com/webanion/termi/pull/13))

### Refactoring

- **docs:** describe the React renderer in AGENTS.md and the README ([7359443](https://github.com/webanion/termi/commit/7359443f4a9a60787bb6ceed2e3c97cd125710c0), [#16](https://github.com/webanion/termi/pull/16))
- **renderer:** render the window with React components ([1986dd5](https://github.com/webanion/termi/commit/1986dd57aa4caef6d7cd1b27f182461f5bfea5d3), [#16](https://github.com/webanion/termi/pull/16))
- **renderer:** hold the state and the terminals outside the page code ([2a740a0](https://github.com/webanion/termi/commit/2a740a0116b55b07daf7cd33af1f82c6240326aa), [#16](https://github.com/webanion/termi/pull/16))
- **renderer:** split the stylesheet into sections in its original order ([d6cd8ae](https://github.com/webanion/termi/commit/d6cd8ae628fa4f331602c563beae6323e4c363b0), [#16](https://github.com/webanion/termi/pull/16))
- **build:** add React to the renderer build and lint ([93aeaf8](https://github.com/webanion/termi/commit/93aeaf8b0aa00d3761684f7a361428ae8aafc119), [#16](https://github.com/webanion/termi/pull/16))
- **agents:** add AGENTS.md for contributors and coding assistants ([3e55d0e](https://github.com/webanion/termi/commit/3e55d0e0474c3b7029c4657ba0b763cbd96d9c84), [#12](https://github.com/webanion/termi/pull/12))
- **renderer:** take layouts and the terminal limit from shared ([3728e45](https://github.com/webanion/termi/commit/3728e4593e8bb9da5830a9afae499f855ac3fca5), [#12](https://github.com/webanion/termi/pull/12))
- **mcp:** split the MCP server and use the shared rules ([e485515](https://github.com/webanion/termi/commit/e4855150b426e16184ab0ee985e9eff5fcf04172), [#12](https://github.com/webanion/termi/pull/12))
- **preload:** build window.termi from the IPC contract ([08899e8](https://github.com/webanion/termi/commit/08899e8745f26875ab6b87fc4c38ede22098a156), [#12](https://github.com/webanion/termi/pull/12))
- **main:** split the main process by job and check every IPC message ([913da6c](https://github.com/webanion/termi/commit/913da6c0f7cd5c5acf4f09b35989e497c668e1d5), [#12](https://github.com/webanion/termi/pull/12))
- **shared:** add the IPC contract, settings schema, saved command rules and layouts ([bbf596c](https://github.com/webanion/termi/commit/bbf596ca85e0fd801afb946e439d91f213a2e793), [#12](https://github.com/webanion/termi/pull/12))
- rename main process modules and the icon script to camelCase ([f01046f](https://github.com/webanion/termi/commit/f01046f8982b1481651890c86cc90f077e73c521))
- **renderer:** format index.html with Prettier ([ac81c4b](https://github.com/webanion/termi/commit/ac81c4b7995b90f2fc8a35cdf4286180aeb8f0cd))
- **readme:** document the dev, start and check commands ([e820674](https://github.com/webanion/termi/commit/e820674e300c06d9007cd73949cfc268c8220e10))
- **mcp:** convert the MCP server to TypeScript and bundle its guide ([d56c89e](https://github.com/webanion/termi/commit/d56c89e5e6ef4b790a5e8a4edef81b923a032c73))
- **renderer:** convert the renderer to TypeScript and bundle xterm ([7de9c2f](https://github.com/webanion/termi/commit/7de9c2f96448fb1b20d855520841a86027f69762))
- **preload:** convert the preload bridge to TypeScript ([2049520](https://github.com/webanion/termi/commit/2049520b36126495d22a4ed8f98be189540cff2b))
- **main:** convert the main process to TypeScript ([15ccb5a](https://github.com/webanion/termi/commit/15ccb5acf3f9cb5149ef1e3486f016eb7d03fc7b))
- **build:** build with electron-vite and check with TypeScript, ESLint and Prettier ([60337b7](https://github.com/webanion/termi/commit/60337b7b53a66812466cd0a51b9f130c32d86614))

### Documentation

- **readme:** show a four-terminal saved command in the screenshot ([10b8f02](https://github.com/webanion/termi/commit/10b8f02efc5705840c991c4b38db8944ab792ab8), [#27](https://github.com/webanion/termi/pull/27))
- **ci:** drop the private repository note from the workflow header ([0257e19](https://github.com/webanion/termi/commit/0257e1924d70e2643befff171d1545c25885a590), [#20](https://github.com/webanion/termi/pull/20))
- **package:** add the repository, homepage, bugs and keywords fields ([88697c5](https://github.com/webanion/termi/commit/88697c5d76322a279b1b1dd8427233002dddcaa9), [#20](https://github.com/webanion/termi/pull/20))
- **repo:** add weekly dependabot updates and an editorconfig ([eb3213e](https://github.com/webanion/termi/commit/eb3213ead292ace2fe13f7654dc9ed480decbb48), [#20](https://github.com/webanion/termi/pull/20))
- **github:** add issue forms, a pull request template and code owners ([c279f69](https://github.com/webanion/termi/commit/c279f69729019b0121475824f7f4afde77c484a5), [#20](https://github.com/webanion/termi/pull/20))
- **conduct:** adopt the Contributor Covenant 2.1 ([24526d3](https://github.com/webanion/termi/commit/24526d33651d225ebf1e565f826f0555c4d206f9), [#20](https://github.com/webanion/termi/pull/20))
- **license:** add the MIT license ([813d4f5](https://github.com/webanion/termi/commit/813d4f5da3a744c07661e40bcb9ebe2ddf4e7594), [#20](https://github.com/webanion/termi/pull/20))
- **security:** add the security policy, with reports through private vulnerability reporting ([c95e59e](https://github.com/webanion/termi/commit/c95e59e1c56e2491912675e76f4802fda1ea292f), [#20](https://github.com/webanion/termi/pull/20))
- **contributing:** add the contribution guide and point AGENTS.md at it ([c8ca697](https://github.com/webanion/termi/commit/c8ca697b0c14d0972c528a0242be38c67d98035f), [#20](https://github.com/webanion/termi/pull/20))
- **readme:** cover installing and running on macOS and Linux, the tests, releases and contributing ([2bb5133](https://github.com/webanion/termi/commit/2bb5133dd650c14fad04c8e5b01e3132634d5221), [#20](https://github.com/webanion/termi/pull/20))

### Tests

- **integration:** run the pty tests in bash, since sh on macOS execs another shell ([522591a](https://github.com/webanion/termi/commit/522591ae96288d24cdf135c3f1580f1735512be7), [#17](https://github.com/webanion/termi/pull/17))
- **docs:** document the test commands ([8113407](https://github.com/webanion/termi/commit/811340714f53c0ce3e3f3b5851e39ef508c7260f), [#17](https://github.com/webanion/termi/pull/17))
- **ci:** run the unit, integration and smoke tests on Linux and macOS ([f505371](https://github.com/webanion/termi/commit/f505371f0a7006c9e67b4c24161def930c8f22d4), [#17](https://github.com/webanion/termi/pull/17))
- **e2e:** drive the built app with Playwright's Electron driver ([e33499d](https://github.com/webanion/termi/commit/e33499dfcf63d4e0a6540a29bdbb28ce95834800), [#17](https://github.com/webanion/termi/pull/17))
- **integration:** test the MCP server over stdio and PtyManager with real shells ([48226ea](https://github.com/webanion/termi/commit/48226eac5b78dc2aa54bec33e78e0fd8bc8fcb63), [#17](https://github.com/webanion/termi/pull/17))
- **unit:** cover settings, saved commands, stats, window state and renderer logic ([1f955b2](https://github.com/webanion/termi/commit/1f955b298dc801fc7b380fad7696c6966134d1fa), [#17](https://github.com/webanion/termi/pull/17))
- **main:** expose the stats parsers and the pty helpers to tests ([ebab1f1](https://github.com/webanion/termi/commit/ebab1f13fcd393ebb7113b18c32fbcec4151d745), [#17](https://github.com/webanion/termi/pull/17))
- **tooling:** add Vitest, jsdom and Playwright with the test scripts ([bb96472](https://github.com/webanion/termi/commit/bb9647238bdf88fa0352e3533293b2acad5159ff), [#17](https://github.com/webanion/termi/pull/17))

### Other

- **deps:** check monthly, with every minor and patch update in one pull request ([087b4b2](https://github.com/webanion/termi/commit/087b4b2261dd953c9e60fcb98e6c24ac5acb4cb6), [#29](https://github.com/webanion/termi/pull/29))
- **repo:** point links at webanion/termi, the repository's new home ([fe7bc06](https://github.com/webanion/termi/commit/fe7bc06a843302f79a7be3bdbbfeeb51c9acdb19), [#26](https://github.com/webanion/termi/pull/26))
- **deps:** hold the majors that cannot land until what they need ships ([1aa374c](https://github.com/webanion/termi/commit/1aa374c4a71776bff69da6d2f6868d652004dd9f), [#26](https://github.com/webanion/termi/pull/26))
- **ci:** bump the actions group with 4 updates ([6524558](https://github.com/webanion/termi/commit/6524558f64fd5ae79be431d178325c8e91ece933), [#21](https://github.com/webanion/termi/pull/21))
- **docs:** document packaging, releases and CI ([7f08343](https://github.com/webanion/termi/commit/7f083433559dc084b69c6156d591d3dc532ac588), [#15](https://github.com/webanion/termi/pull/15))
- **release:** add the manual release workflow with macOS and Linux packages ([c7b9b46](https://github.com/webanion/termi/commit/c7b9b4637e0446963e47e94fcea82b26049ffaae), [#15](https://github.com/webanion/termi/pull/15))
- **ci:** add the CI gate for pull requests and main on Linux and macOS ([4741922](https://github.com/webanion/termi/commit/474192232aa73e699bbbdb67745753d9d4b1aff5), [#15](https://github.com/webanion/termi/pull/15))
- **agents:** list the script tests in AGENTS.md ([e83f698](https://github.com/webanion/termi/commit/e83f698f5da1ad4da151ec9d2a2cb0b0ea0dee94), [#14](https://github.com/webanion/termi/pull/14))
- **changelog:** add CHANGELOG.md and list the script tests in the README ([6e5c7c1](https://github.com/webanion/termi/commit/6e5c7c16e6a6b6c4e3efa7ed36826deff1c381f7), [#14](https://github.com/webanion/termi/pull/14))
- **changelog:** add the changelog tool and its tests ([7183fd1](https://github.com/webanion/termi/commit/7183fd1a9e14731168a61a548a3d1d049481ce7a), [#14](https://github.com/webanion/termi/pull/14))
- **version:** restart numbering at 0.1.0 ([8c90c2f](https://github.com/webanion/termi/commit/8c90c2fd3665ab316443bee993edd5cba7a722a5), [#14](https://github.com/webanion/termi/pull/14))
- Initial commit ([ecbb450](https://github.com/webanion/termi/commit/ecbb450aacfc0c8dbdf7784f30142aa3a1358a02))
