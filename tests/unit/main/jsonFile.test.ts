import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readJson, writeJson } from '../../../src/main/jsonFile';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'termi-json-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('readJson', () => {
  it('returns the fallback when the file is missing or broken', () => {
    expect(readJson(path.join(dir, 'missing.json'), { a: 1 })).toEqual({ a: 1 });
    fs.writeFileSync(path.join(dir, 'broken.json'), '{ not json');
    expect(readJson(path.join(dir, 'broken.json'), null)).toBeNull();
  });

  it('reads what writeJson wrote', () => {
    const file = path.join(dir, 'nested', 'deeper', 'settings.json');
    writeJson(file, { commands: [{ id: 'x' }], fontSize: 14 });
    expect(readJson(file, null)).toEqual({ commands: [{ id: 'x' }], fontSize: 14 });
  });
});

describe('writeJson', () => {
  it('writes through a temp file named with the process id, then renames it', () => {
    const rename = vi.spyOn(fs, 'renameSync');
    const file = path.join(dir, 'settings.json');
    writeJson(file, { ok: true });
    expect(rename).toHaveBeenCalledWith(`${file}.${process.pid}.tmp`, file);
    expect(fs.readdirSync(dir)).toEqual(['settings.json']);
  });

  it('leaves the old file whole when writing the temp file fails', () => {
    const file = path.join(dir, 'settings.json');
    writeJson(file, { version: 1 });
    vi.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(() => writeJson(file, { version: 2 })).toThrow('disk full');
    expect(readJson(file, null)).toEqual({ version: 1 });
  });
});
