import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveCwd, shellEnv } from '../../../src/main/ptyManager';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveCwd', () => {
  const home = os.homedir();

  it('uses the home folder when no folder is given', () => {
    expect(resolveCwd(undefined)).toBe(home);
    expect(resolveCwd('')).toBe(home);
    expect(resolveCwd('   ')).toBe(home);
  });

  it('expands ~ to the home folder', () => {
    expect(resolveCwd('~')).toBe(home);
    const sub = fs.mkdtempSync(path.join(home, '.termi-cwd-'));
    try {
      expect(resolveCwd(`~/${path.basename(sub)}`)).toBe(sub);
    } finally {
      fs.rmSync(sub, { recursive: true, force: true });
    }
  });

  it('keeps a folder that exists', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'termi-cwd-'));
    try {
      expect(resolveCwd(`  ${dir}  `)).toBe(dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to the home folder when the folder is missing or is a file', () => {
    expect(resolveCwd('/no/such/folder/for/termi')).toBe(home);
    const file = path.join(os.tmpdir(), `termi-file-${process.pid}`);
    fs.writeFileSync(file, '');
    try {
      expect(resolveCwd(file)).toBe(home);
    } finally {
      fs.rmSync(file);
    }
  });
});

describe('shellEnv', () => {
  it('sets the terminal variables and removes ELECTRON_RUN_AS_NODE', () => {
    vi.stubEnv('ELECTRON_RUN_AS_NODE', '1');
    vi.stubEnv('TERM', 'dumb');
    const env = shellEnv();
    expect(env.TERM).toBe('xterm-256color');
    expect(env.COLORTERM).toBe('truecolor');
    expect(env.TERM_PROGRAM).toBe('Termi');
    expect(env).not.toHaveProperty('ELECTRON_RUN_AS_NODE');
  });

  it('gives a locale when there is none, and keeps one that is set', () => {
    vi.stubEnv('LANG', '');
    expect(shellEnv().LANG).toBe('en_US.UTF-8');
    vi.stubEnv('LANG', 'de_DE.UTF-8');
    expect(shellEnv().LANG).toBe('de_DE.UTF-8');
  });
});

describe('shellEnv, started through npm', () => {
  const npmBin = [
    '/home/user/code/termi/node_modules/.bin',
    '/home/user/code/node_modules/.bin',
    '/home/user/node_modules/.bin',
    '/home/node_modules/.bin',
    '/node_modules/.bin',
    '/opt/node/lib/node_modules/npm/node_modules/@npmcli/run-script/lib/node-gyp-bin',
  ];
  const userPath = ['/home/user/.local/bin', '/usr/local/bin', '/usr/bin', '/bin'];
  const npmRun = {
    HOME: '/home/user',
    SHELL: '/bin/zsh',
    NPM_TOKEN: 'user-token',
    COLOR: '1',
    EDITOR: 'vi',
    INIT_CWD: '/home/user/code/termi/src',
    NODE: '/opt/node/bin/node',
    npm_command: 'run',
    npm_config_cache: '/home/user/.npm',
    npm_config_user_agent: 'npm/11.0.0 node/v24.0.0 linux x64 workspaces/false',
    npm_execpath: '/opt/node/lib/node_modules/npm/bin/npm-cli.js',
    npm_lifecycle_event: 'dev',
    npm_lifecycle_script: 'env -u ELECTRON_RUN_AS_NODE electron-vite dev',
    npm_node_execpath: '/opt/node/bin/node',
    npm_package_json: '/home/user/code/termi/package.json',
    npm_package_name: 'termi',
    npm_package_version: '0.1.0',
  };

  it('removes the variables npm added and keeps the ones the user set', () => {
    const env = shellEnv({ ...npmRun, PATH: [...npmBin, ...userPath].join(':') });
    for (const key of ['COLOR', 'EDITOR', 'INIT_CWD', 'NODE']) expect(env).not.toHaveProperty(key);
    expect(Object.keys(env).filter((key) => key.startsWith('npm_'))).toEqual([]);
    expect(env.HOME).toBe('/home/user');
    expect(env.SHELL).toBe('/bin/zsh');
    expect(env.NPM_TOKEN).toBe('user-token');
  });

  it('takes the folders npm added off the front of PATH and keeps the rest in order', () => {
    const env = shellEnv({ ...npmRun, PATH: [...npmBin, ...userPath].join(':') });
    expect(env.PATH).toBe(userPath.join(':'));
  });

  it('keeps a node_modules/.bin that the user has later in PATH', () => {
    const own = ['/usr/bin', '/home/user/code/termi/node_modules/.bin', '/bin'];
    const env = shellEnv({ ...npmRun, PATH: [...npmBin, ...own].join(':') });
    expect(env.PATH).toBe(own.join(':'));
  });

  it('keeps a node_modules/.bin of another folder at the front of the PATH the user had', () => {
    const own = ['/home/user/other/node_modules/.bin', '/usr/bin'];
    const env = shellEnv({ ...npmRun, PATH: [...npmBin, ...own].join(':') });
    expect(env.PATH).toBe(own.join(':'));
  });

  it('takes off what a nested npm run added as well', () => {
    const env = shellEnv({ ...npmRun, PATH: [...npmBin, ...npmBin, ...userPath].join(':') });
    expect(env.PATH).toBe(userPath.join(':'));
  });

  it('leaves the environment alone when Termi was not started through npm', () => {
    const source = {
      HOME: '/home/user',
      EDITOR: 'nano',
      NODE: '/opt/node/bin/node',
      npm_config_registry: 'https://registry.example.com/',
      PATH: ['/home/user/code/termi/node_modules/.bin', ...userPath].join(':'),
    };
    const env = shellEnv(source);
    expect(env.EDITOR).toBe('nano');
    expect(env.NODE).toBe('/opt/node/bin/node');
    expect(env.npm_config_registry).toBe('https://registry.example.com/');
    expect(env.PATH).toBe(source.PATH);
  });

  it('does not change the environment it copies', () => {
    const source = { ...npmRun, PATH: [...npmBin, ...userPath].join(':') };
    const before = { ...source };
    shellEnv(source);
    expect(source).toEqual(before);
  });
});

describe('shellEnv, started through electron-vite', () => {
  const electronVite = {
    HOME: '/home/user',
    PATH: '/usr/bin:/bin',
    NODE_ENV: 'development',
    NODE_ENV_ELECTRON_VITE: 'development',
    ELECTRON_RENDERER_URL: 'http://localhost:5173',
    ELECTRON_EXEC_PATH: '/home/user/code/termi/node_modules/electron/dist/electron',
    ELECTRON_MAJOR_VER: '44',
    ELECTRON_CLI_ARGS: '[]',
    NO_SANDBOX: '1',
    REMOTE_DEBUGGING_PORT: '9222',
  };

  it('removes what electron-vite added for the development tooling', () => {
    const env = shellEnv(electronVite);
    for (const key of Object.keys(electronVite)) {
      if (key === 'HOME' || key === 'PATH') continue;
      expect(env).not.toHaveProperty(key);
    }
    expect(env.HOME).toBe('/home/user');
    expect(env.PATH).toBe('/usr/bin:/bin');
  });

  it('keeps NODE_ENV when electron-vite did not start Termi', () => {
    expect(shellEnv({ HOME: '/home/user', NODE_ENV: 'production' }).NODE_ENV).toBe('production');
  });
});
