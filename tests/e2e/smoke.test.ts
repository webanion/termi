// The built app, launched through Playwright's Electron driver with a temporary data folder.
// Run it with `npm run smoke`, which builds first. On Linux without a display, run it under
// xvfb-run.
import { spawnSync } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import { _electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.join(__dirname, '..', '..');
const ELECTRON = createRequire(import.meta.url)('electron') as unknown as string;

let dir: string;
let app: ElectronApplication;
let page: Page;
const problems: string[] = [];

const marker = (n: number) => path.join(dir, `marker-${n}`);

async function until(check: () => Promise<boolean> | boolean, ms = 10_000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Timed out waiting');
}

const text = (selector: string) => page.locator(selector).first().textContent();

const settingsFile = () =>
  JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8')) as Record<string, unknown>;

// A menu item's click, as when it is chosen from the menu, on either platform.
const clickMenu = (id: string) =>
  app.evaluate(({ Menu }, itemId) => {
    const item = Menu.getApplicationMenu()?.getMenuItemById(itemId);
    if (!item) throw new Error(`No menu item ${itemId}`);
    item.click();
  }, id);

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'termi-e2e-'));
  const quad = [1, 2, 3, 4].map((n) => ({ command: `echo ${n} > '${marker(n)}'` }));
  fs.writeFileSync(
    path.join(dir, 'settings.json'),
    JSON.stringify({
      version: 1,
      commands: [
        {
          id: 'quad0001',
          name: 'Quad',
          terminals: quad,
          cwd: '~',
          autoStart: true,
          layout: 'grid',
        },
      ],
    }),
  );
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  }
  env.TERMI_USER_DATA = dir;
  app = await _electron.launch({ executablePath: ELECTRON, args: [ROOT], env, timeout: 60_000 });
  page = await app.firstWindow();
  page.on('console', (message) => {
    if (!['error', 'warning'].includes(message.type())) return;
    // xterm warns when one of its idle tasks overruns by 20ms, which follows the machine's load,
    // not Termi. Anything else the page logs is a problem.
    if (/^task queue exceeded allotted deadline by \d+ms$/.test(message.text())) return;
    problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
  await page.waitForSelector('#terminal-list .item', { timeout: 30_000 });
});

afterAll(async () => {
  if (app) {
    await app.evaluate(({ dialog }) => {
      dialog.showMessageBoxSync = (() => 0) as unknown as typeof dialog.showMessageBoxSync;
    });
    await app.close();
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('Termi', () => {
  it('opens the auto-start command with its four terminals in its layout', async () => {
    await until(() => [1, 2, 3, 4].every((n) => fs.existsSync(marker(n))));
    expect(await page.locator('.tab-view.active .term-pane').count()).toBe(4);
    expect(await page.locator('.tab-view.active').getAttribute('style')).toContain('"a b" "c d"');
    expect(await text('#title-text')).toBe('Quad');
  });

  // The file the test starts from is version 1, from before the guide, like an upgrade.
  it('opens the guide by itself on the first launch, and records that it did', async () => {
    const guide = page.locator('#guide-dialog');
    await until(async () => (await guide.getAttribute('open')) !== null);
    expect(await text('#guide-title')).toBe('Terminals and tabs');
    await page.locator('#guide-next').click();
    expect(await text('#guide-title')).toBe('Saved commands');
    await page.keyboard.press('Escape');
    await until(async () => (await guide.getAttribute('open')) === null);
    await until(() => settingsFile().guideSeen === true);
    expect(settingsFile().version).toBe(2);
  });

  it('sends typing through xterm to the shell', async () => {
    await page.locator('.tab-view.active .xterm-helper-textarea').first().focus();
    await page.keyboard.type(`echo typed > '${marker(5)}'`);
    await page.keyboard.press('Enter');
    await until(() => fs.existsSync(marker(5)));
  });

  it("brings a background tab's output back to the page", async () => {
    await page.keyboard.type('sleep 2; echo later');
    await page.keyboard.press('Enter');
    await page.locator('#add-terminal').click();
    await until(async () => (await page.locator('#terminal-list .item').count()) === 2);
    // Output that reaches a tab that is not showing lights its activity dot.
    await until(
      async () => (await page.locator('#terminal-list .item .dot.activity').count()) === 1,
    );
  });

  it('shows a change made through the MCP server', async () => {
    const rename = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'edit_saved_command', arguments: { target: 'Quad', name: 'Quad renamed' } },
      },
    ];
    const mcp = spawnSync(process.execPath, [path.join(ROOT, 'out', 'main', 'mcpServer.js')], {
      input: rename.map((m) => JSON.stringify(m)).join('\n') + '\n',
      env: { ...process.env, TERMI_USER_DATA: dir },
      timeout: 10_000,
    });
    expect(mcp.stdout.toString()).toContain('Quad renamed');
    await until(async () => (await text('#command-list .item-name')) === 'Quad renamed');
    await until(async () =>
      (await page.locator('#terminal-list .item-name').allTextContents()).includes('Quad renamed'),
    );
  });

  it('lists the shortcuts and runs actions from the palette, through the menu', async () => {
    const mac = process.platform === 'darwin';
    await clickMenu('show-shortcuts');
    const sheet = page.locator('#shortcut-sheet');
    await until(async () => (await sheet.getAttribute('open')) !== null);
    expect(await sheet.locator('.shortcut-row').count()).toBeGreaterThan(10);
    expect(await sheet.textContent()).toContain(mac ? '⌘T' : 'Ctrl+Shift+T');
    await page.keyboard.press('Escape');
    await until(async () => (await sheet.getAttribute('open')) === null);

    for (const [query, size] of [
      ['bigger', 14],
      ['default text', 13],
    ] as const) {
      await clickMenu('command-palette');
      await page.locator('#palette-input').waitFor();
      await page.keyboard.type(query);
      await page.keyboard.press('Enter');
      await until(() => settingsFile().fontSize === size);
    }
  });

  it('opens the bug report form, filled in, and sends nothing itself', async () => {
    await app.evaluate(({ shell }) => {
      const record = globalThis as unknown as { opened: string[] };
      record.opened = [];
      shell.openExternal = (async (url: string) => {
        record.opened.push(url);
      }) as typeof shell.openExternal;
    });
    await clickMenu('report-issue');
    const opened = () => app.evaluate(() => (globalThis as unknown as { opened: string[] }).opened);
    await until(async () => (await opened()).length === 1);
    const url = new URL((await opened())[0] ?? '');
    expect(url.pathname).toBe('/webanion/termi/issues/new');
    expect(url.searchParams.get('template')).toBe('bug_report.yml');
    expect(url.searchParams.get('version')).toMatch(/^\d+\.\d+\.\d+/);
  });

  // Other systems take the shortcuts in main, before xterm, and leave it every plain Ctrl+letter.
  // Keys go in through Electron's own input, because Playwright's key presses skip the handler
  // main uses for them.
  it.runIf(process.platform !== 'darwin')(
    'takes Ctrl+Shift+T from the terminal, and leaves Ctrl+W to the shell',
    async () => {
      const press = (keyCode: string, modifiers: string[]) =>
        app.evaluate(
          ({ BrowserWindow }, key) => {
            const [win] = BrowserWindow.getAllWindows();
            if (!win) throw new Error('No window to press keys in');
            const contents = win.webContents;
            const event = { keyCode: key.keyCode, modifiers: key.modifiers } as const;
            contents.sendInputEvent({ ...event, type: 'keyDown' } as Electron.KeyboardInputEvent);
            contents.sendInputEvent({ ...event, type: 'keyUp' } as Electron.KeyboardInputEvent);
          },
          { keyCode, modifiers },
        );
      const count = () => page.locator('#terminal-list .item').count();
      const before = await count();
      await page.locator('.tab-view.active .xterm-helper-textarea').first().focus();
      await press('T', ['control', 'shift']);
      await until(async () => (await count()) === before + 1);

      // The new shell has to be reading its line before Ctrl+W means anything to it.
      await page.locator('.tab-view.active .xterm-helper-textarea').first().focus();
      await page.keyboard.type(`echo ready > '${marker(6)}'`);
      await page.keyboard.press('Enter');
      await until(() => fs.existsSync(marker(6)));

      // Ctrl+W deletes the word before the cursor instead of closing the tab.
      await page.keyboard.type('echo kept dropped');
      await press('W', ['control']);
      await page.keyboard.type(`> '${marker(7)}'`);
      await page.keyboard.press('Enter');
      await until(
        () => fs.existsSync(marker(7)) && fs.readFileSync(marker(7), 'utf8').trim() === 'kept',
      );
      expect(await count()).toBe(before + 1);
    },
  );

  it('asks before quitting while a program runs', async () => {
    await page.locator('.tab-view.active .xterm-helper-textarea').first().focus();
    await page.keyboard.type('sleep 30');
    await page.keyboard.press('Enter');
    await until(
      async () => (await page.locator('#terminal-list .item.active .dot.busy').count()) === 1,
    );
    await app.evaluate(({ dialog }) => {
      const record = globalThis as unknown as { asked: number };
      record.asked = 0;
      dialog.showMessageBoxSync = (() => {
        record.asked += 1;
        return 1; // Cancel
      }) as unknown as typeof dialog.showMessageBoxSync;
    });
    await page.evaluate('window.termi.window.close()');
    await new Promise((r) => setTimeout(r, 800));
    expect(await app.evaluate(() => (globalThis as unknown as { asked: number }).asked)).toBe(1);
    expect(app.windows()).toHaveLength(1);
  });

  // Last among the page checks: the blocked navigation leaves Playwright waiting on the page.
  it('gives the page no Node, and keeps it from navigating away', async () => {
    expect(await page.evaluate('typeof require + typeof process')).toBe('undefinedundefined');
    const before = page.url();
    await page.evaluate("location.href = 'https://example.com'");
    await new Promise((r) => setTimeout(r, 500));
    expect(page.url()).toBe(before);
  });

  it('logs no errors or warnings in the page', () => {
    expect(problems).toEqual([]);
  });
});
