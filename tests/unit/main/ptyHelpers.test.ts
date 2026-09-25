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
