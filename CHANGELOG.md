# Changelog

Every release of Termi, newest first. Each section is written by `scripts/changelog.mjs` from the Conventional Commits since the release before it, and is that version's GitHub Release notes.

## v0.1.4 (2026-09-30)

[Compare with v0.1.3](https://github.com/webanion/termi/compare/v0.1.3...v0.1.4)

### Features

- **settings:** add the Wrap long lines switch to the settings panel ([da262a1](https://github.com/webanion/termi/commit/da262a17be79fc60f62abe77195fb08b50066c2e), [#85](https://github.com/webanion/termi/pull/85))
- **terminal:** toggle word wrap in the focused terminal with a shortcut ([917b553](https://github.com/webanion/termi/commit/917b553b6117f6a0722823436dee9d2dab0c27f5), [#85](https://github.com/webanion/termi/pull/85))
- **ipc:** let the page set the check mark on the Word Wrap menu item ([530dc6a](https://github.com/webanion/termi/commit/530dc6a53cfeff8e246879036a5575086dfd43a4), [#85](https://github.com/webanion/termi/pull/85))
- **settings:** add whether a new terminal wraps long lines ([71a2f98](https://github.com/webanion/termi/commit/71a2f98fed4b83746fa0185ef448064d99695153), [#85](https://github.com/webanion/termi/pull/85))
- **settings:** add the smooth scrolling switch to the settings panel ([b769544](https://github.com/webanion/termi/commit/b7695440565782532d56dc60397140f40655f47a), [#84](https://github.com/webanion/termi/pull/84))
- **terminal:** scroll smoothly with a mouse wheel, with a setting to turn it off ([02c7219](https://github.com/webanion/termi/commit/02c7219e94a9e646782f7c35991250699c3bf01b), [#84](https://github.com/webanion/termi/pull/84))
- **settings:** add a settings panel, opened with Cmd+, or Ctrl+, ([0b456ed](https://github.com/webanion/termi/commit/0b456ed7cb3c2e0a6f1295299b7931225b5cfe45), [#78](https://github.com/webanion/termi/pull/78))
- **ipc:** let the page read and set Open at Login on macOS ([805cc49](https://github.com/webanion/termi/commit/805cc4976565626e1b0ab470079601d91482697a), [#78](https://github.com/webanion/termi/pull/78))
- **settings:** add the cursor settings and range check each setting ([bac2559](https://github.com/webanion/termi/commit/bac2559832805297f35b7a5039f42d9654e7ce81), [#78](https://github.com/webanion/termi/pull/78))
- **mcp:** set the view of a saved command ([45723db](https://github.com/webanion/termi/commit/45723db8ce3c143185304fabf61814014ce7cd66), [#77](https://github.com/webanion/termi/pull/77))
- **tabs:** show a tab's terminals one at a time as tabs ([b0b8412](https://github.com/webanion/termi/commit/b0b8412e05ecb613e4a6dec1b8ba29356048a112), [#77](https://github.com/webanion/termi/pull/77))
- **settings:** save a view on each saved command ([9d7492a](https://github.com/webanion/termi/commit/9d7492a0bc7af126040fbe62aaa1382b2636cab9), [#77](https://github.com/webanion/termi/pull/77))

### Fixes

- **pty:** write mouse reports in the X10 encoding to the shell as bytes ([e9a8ed6](https://github.com/webanion/termi/commit/e9a8ed6b56e3e1f43c80261e480b57b88a5ffe06), [#83](https://github.com/webanion/termi/pull/83))
- **release:** start the release jobs only for a branch in this repository ([3da2cfa](https://github.com/webanion/termi/commit/3da2cfab83138a094128e764803a4d1e495fe959), [#80](https://github.com/webanion/termi/pull/80))

### Refactoring

- **styles:** remove the scrollbar styles xterm 6 draws over ([5a6dab3](https://github.com/webanion/termi/commit/5a6dab3faba3f83049862fd22d5039f5c4807f7a), [#84](https://github.com/webanion/termi/pull/84))

### Documentation

- **terminal:** describe word wrap in the README and the guide ([eef0201](https://github.com/webanion/termi/commit/eef020124826836f3e8d70af20f51e6a7b0024d8), [#85](https://github.com/webanion/termi/pull/85))
- **settings:** describe smooth scrolling in the README and the guide ([65dd8ff](https://github.com/webanion/termi/commit/65dd8ffe7bcbeea2dd8620fcf3f109f145635436), [#84](https://github.com/webanion/termi/pull/84))
- **settings:** describe the settings panel in the README and the guide ([a6391dd](https://github.com/webanion/termi/commit/a6391ddd10ea9e88f018acd4bf5f13251d9d7c47), [#78](https://github.com/webanion/termi/pull/78))
- **tabs:** describe tab view in the README and the guide ([23676b3](https://github.com/webanion/termi/commit/23676b3c04a2a7eff488f7729b8b3fc93d5a2897), [#77](https://github.com/webanion/termi/pull/77))

### Tests

- **terminal:** give the word wrap test's runtime mock the methods animation frames call ([1e728e4](https://github.com/webanion/termi/commit/1e728e4c1d5b48ee8e13f7e3e9e66700839e9853), [#85](https://github.com/webanion/termi/pull/85))

### Other

- move the app ID, author, copyright and conduct contact to Webanion ([b78786c](https://github.com/webanion/termi/commit/b78786c6ff88cd9d1f2fef5f6d644c6bb6511fd2), [#82](https://github.com/webanion/termi/pull/82))

## v0.1.3 (2026-09-29)

[Compare with v0.1.2](https://github.com/webanion/termi/compare/v0.1.2...v0.1.3)

### Features

- **renderer:** leave text drags to the browser so text still drops into a field ([792f0c8](https://github.com/webanion/termi/commit/792f0c8e12a24b12d699ec312ff2373a1a49be26), [#67](https://github.com/webanion/termi/pull/67))
- **e2e:** check that a saved command's closed terminal reopens in its place ([69c520a](https://github.com/webanion/termi/commit/69c520a129f601b8afb2c8820c074608f98b6a83), [#69](https://github.com/webanion/termi/pull/69))
- **guide:** explain terminal titles ([db20773](https://github.com/webanion/termi/commit/db20773015962ccd0ff75a6b85f0f3a6baadbb52), [#70](https://github.com/webanion/termi/pull/70))
- **dialog:** call the pane head a header in the title hint ([243d8ed](https://github.com/webanion/termi/commit/243d8ed215c892c5e2700e734045b439a6f7e6b6), [#70](https://github.com/webanion/termi/pull/70))
- **guide:** explain how to reopen a saved command's closed terminals ([4f72ce5](https://github.com/webanion/termi/commit/4f72ce53541507c7037bd2878013979d5806576f), [#69](https://github.com/webanion/termi/pull/69))
- **guide:** explain how to resize split terminals ([f036173](https://github.com/webanion/termi/commit/f03617374f0b29a726b8ba1be7eed893e7d397f3), [#68](https://github.com/webanion/termi/pull/68))
- **mcp:** keep terminal titles through edits and list them ([3542537](https://github.com/webanion/termi/commit/35425376c2c613c3d6cae1e9fae0539aefd9e45a), [#70](https://github.com/webanion/termi/pull/70))
- **terminals:** reach the resize handles with Tab before the terminals ([c3e6262](https://github.com/webanion/termi/commit/c3e6262a61840eb989a90af53e4c4ecabde76a62), [#68](https://github.com/webanion/termi/pull/68))
- **sidebar:** show how many of a saved command's terminals are open ([4099d6c](https://github.com/webanion/termi/commit/4099d6c563b67f039c14091782cd34bd436d0216), [#69](https://github.com/webanion/termi/pull/69))
- **renderer:** let the drop tests' terminals fit, as a real one does ([0a5ed09](https://github.com/webanion/termi/commit/0a5ed0906a80278c5daceb0668f5cbd865a03027), [#67](https://github.com/webanion/termi/pull/67))
- **terminals:** resize split panes by dragging the line between them ([77159be](https://github.com/webanion/termi/commit/77159bec0939ef70f25be8a71857174e20292c3f), [#68](https://github.com/webanion/termi/pull/68))
- **header:** add a Reopen menu that lists a saved command's closed terminals ([eafe8c0](https://github.com/webanion/termi/commit/eafe8c0365ef7649a7a52c555a7843b78f0b5ad4), [#69](https://github.com/webanion/termi/pull/69))
- **renderer:** show a terminal's title in its pane head ([d6558ea](https://github.com/webanion/termi/commit/d6558ea443f148707f3b88ec5de6111ef9286f8b), [#70](https://github.com/webanion/termi/pull/70))
- **guide:** explain dropping files and folders ([29f1bc2](https://github.com/webanion/termi/commit/29f1bc25969ffce3d2f0310f2739ef0a278cef85), [#67](https://github.com/webanion/termi/pull/67))
- **sidebar:** open a terminal in a folder dropped on the sidebar ([5c6ce5d](https://github.com/webanion/termi/commit/5c6ce5dc3193463d6e58f5aa6b63472ab536cbea), [#67](https://github.com/webanion/termi/pull/67))
- **dialog:** add a title field to each terminal of a saved command ([fbf5c68](https://github.com/webanion/termi/commit/fbf5c68c16ff924b19ab75293c49753a848ecf47), [#70](https://github.com/webanion/termi/pull/70))
- **guide:** explain the layout picker in the saved command dialog ([dfb34a6](https://github.com/webanion/termi/commit/dfb34a6099d1d3b021f6775fe1317e20b73f7ab6), [#65](https://github.com/webanion/termi/pull/65))
- **guide:** explain how to run a saved command from the keyboard ([35a3783](https://github.com/webanion/termi/commit/35a3783e8a68071202a7cbaced077c461572de80), [#66](https://github.com/webanion/termi/pull/66))
- **renderer:** search and start saved commands from a panel on Cmd+P ([0f34425](https://github.com/webanion/termi/commit/0f34425f243fe87738e7edb91ccdd6bcd999fbb6), [#66](https://github.com/webanion/termi/pull/66))
- **dialog:** pick the layout in the saved command dialog ([915fe76](https://github.com/webanion/termi/commit/915fe76360cabf7ac14349598545a42ac8b746c3), [#65](https://github.com/webanion/termi/pull/65))
- **shortcuts:** add a Reopen Closed Terminals action to the menu, palette and keys ([7c47789](https://github.com/webanion/termi/commit/7c47789f788afea082de28f49c3347e89035ff24), [#69](https://github.com/webanion/termi/pull/69))
- **renderer:** type a dropped file's path into the terminal under the pointer ([e946dea](https://github.com/webanion/termi/commit/e946dea5831f7658ac835585dae39d7239c6678a), [#67](https://github.com/webanion/termi/pull/67))
- **terminals:** add the track math for resizing split panes ([544f35f](https://github.com/webanion/termi/commit/544f35fa11589d39724b50035d3f878113d9fe16), [#68](https://github.com/webanion/termi/pull/68))
- **renderer:** reopen a saved command's closed terminals in their places ([422bed7](https://github.com/webanion/termi/commit/422bed70065cb392092d9fecd7b26fa6e1d69042), [#69](https://github.com/webanion/termi/pull/69))
- **shared:** add an optional title to each terminal of a saved command ([150ccd2](https://github.com/webanion/termi/commit/150ccd2f9b409a86895e3b8227b00e93de100e27), [#70](https://github.com/webanion/termi/pull/70))
- **header:** share the layout radio group and select a layout with the arrow keys ([ef2f4bc](https://github.com/webanion/termi/commit/ef2f4bc433eecda401f11a4f477eb15b100145d7), [#65](https://github.com/webanion/termi/pull/65))
- **renderer:** share the command palette's search field and list ([a8db198](https://github.com/webanion/termi/commit/a8db198f9e88887623f7c3b9d831a11e6700e5e0), [#66](https://github.com/webanion/termi/pull/66))
- **renderer:** drop a saved layout that no longer fits the number of terminals ([21ac85a](https://github.com/webanion/termi/commit/21ac85a5ef9063ca5e5dc16e33644550fa1933ca), [#65](https://github.com/webanion/termi/pull/65))
- **preload:** give the page the path of a dropped file ([21c284b](https://github.com/webanion/termi/commit/21c284b40a98df3fc2b3e43014a8980782d6da71), [#67](https://github.com/webanion/termi/pull/67))
- **guide:** explain the terminal right-click menu ([fa666ef](https://github.com/webanion/termi/commit/fa666ef7c7a11eb6b76502fe31e3cd341f883408), [#64](https://github.com/webanion/termi/pull/64))
- **terminals:** show a copy and paste menu on right-click ([8e346ab](https://github.com/webanion/termi/commit/8e346ab1f4475693aa9f377c059cc96e316a2edd), [#64](https://github.com/webanion/termi/pull/64))
- **guide:** explain how to split a tab ([b96d41b](https://github.com/webanion/termi/commit/b96d41bc511a4b9f628df21fa0eb5960ddd3490d), [#48](https://github.com/webanion/termi/pull/48))
- **header:** add a split button next to the layout control ([627e5e0](https://github.com/webanion/termi/commit/627e5e0177153d4ad65b19b5c220d7fd9734dc2c), [#48](https://github.com/webanion/termi/pull/48))
- **terminals:** split a tab to add a plain shell to it ([f318f51](https://github.com/webanion/termi/commit/f318f51300ed79610ae3e2927ef22cad23cedd31), [#48](https://github.com/webanion/termi/pull/48))

### Fixes

- **e2e:** ask for SGR mouse reports in the right-click test, as tmux and vim do ([88ffa6e](https://github.com/webanion/termi/commit/88ffa6e76a2337dd68da5f16d2e0ca24f871cb1c), [#74](https://github.com/webanion/termi/pull/74))
- **guide:** say which right-click opens the menu over a program that takes the mouse ([1e085d0](https://github.com/webanion/termi/commit/1e085d0018fed7ce002e0a624df4471ea75f97f8), [#74](https://github.com/webanion/termi/pull/74))
- **terminals:** leave a right-click to a program that takes the mouse ([34db0a4](https://github.com/webanion/termi/commit/34db0a482d91766799d4603780bea85ee78444cc), [#74](https://github.com/webanion/termi/pull/74))
- **renderer:** inset the command palette search field ([849eb88](https://github.com/webanion/termi/commit/849eb88de17a5ecd7f8b3518c6426cec97878160), [#62](https://github.com/webanion/termi/pull/62))
- **sidebar:** size the speed column for the widest speed ([ac0c08a](https://github.com/webanion/termi/commit/ac0c08a134701f577bb7167b41e586260e886d3e), [#47](https://github.com/webanion/termi/pull/47))
- **stats:** pick the byte unit after rounding ([551d43d](https://github.com/webanion/termi/commit/551d43d62eb23a5c4f66bf950d1b80041749de6e), [#47](https://github.com/webanion/termi/pull/47))

### Refactoring

- import the context menu and its tests through @/ ([d840bd1](https://github.com/webanion/termi/commit/d840bd1394b9082a8932ade004cd5c6b27e6b3d9), [#72](https://github.com/webanion/termi/pull/72))
- **lint:** refuse a ../ import that @/ could replace ([a5370c2](https://github.com/webanion/termi/commit/a5370c273330fcc35d3c61935d9961634389fd76), [#72](https://github.com/webanion/termi/pull/72))
- import from other folders of src through @/ ([db526df](https://github.com/webanion/termi/commit/db526df423d64ad29d6412f04ed84285644eb1f6), [#72](https://github.com/webanion/termi/pull/72))
- **build:** resolve @/ to src in the builds, the typecheck and the tests ([5a1f662](https://github.com/webanion/termi/commit/5a1f6627a7eedf704ad1862c2d2f0b614a21613c), [#72](https://github.com/webanion/termi/pull/72))

### Tests

- **renderer:** give the terminal menu test's fake runtime fit and focus ([c011293](https://github.com/webanion/termi/commit/c011293b2e647236a606fe1d2768d62b43f56430), [#73](https://github.com/webanion/termi/pull/73))
- **e2e:** drop on the first pane past the resize handles ([6c0bef1](https://github.com/webanion/termi/commit/6c0bef11af0fb3e8144055e1a9a6f0d55d90be3a), [#68](https://github.com/webanion/termi/pull/68))

## v0.1.2 (2026-09-27)

[Compare with v0.1.1](https://github.com/webanion/termi/compare/v0.1.1...v0.1.2)

### Fixes

- **release:** sign the macOS build and check its signature ([7d32480](https://github.com/webanion/termi/commit/7d32480aa7864463fea207190f8b965a7c884386), [#43](https://github.com/webanion/termi/pull/43))
- **mac:** sign the app ad hoc so macOS does not call it damaged ([576d0fc](https://github.com/webanion/termi/commit/576d0fc9481ba0f83263e71a2fdec81163278283), [#43](https://github.com/webanion/termi/pull/43))

## v0.1.1 (2026-09-25)

[Compare with v0.1.0](https://github.com/webanion/termi/compare/v0.1.0...v0.1.1)

### Fixes

- **linux:** install the icon at every size the icon theme looks in ([694243b](https://github.com/webanion/termi/commit/694243bf0aefb409fc7b4f74adb373ca29449a6c), [#38](https://github.com/webanion/termi/pull/38))

### Documentation

- **readme:** correct the text size keys, the macOS first launch, and state there is no telemetry ([21e7ef2](https://github.com/webanion/termi/commit/21e7ef2df4323d50b6581a2c26198f0f18405ad2), [#37](https://github.com/webanion/termi/pull/37))
- **readme:** link the product site at termi.webanion.com ([9cb43bb](https://github.com/webanion/termi/commit/9cb43bb34904292c4b4383305d90b947996ed183), [#36](https://github.com/webanion/termi/pull/36))

### Other

- **release:** credit the contributors in the release notes ([26397e9](https://github.com/webanion/termi/commit/26397e96d24ba6b5a3f716d0f35e43299cfa056b), [#35](https://github.com/webanion/termi/pull/35))

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
