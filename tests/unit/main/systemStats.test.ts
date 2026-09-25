import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  parseMeminfo,
  parseNetstat,
  parseProcNetDev,
  parseVmStat,
  speed,
} from '../../../src/main/systemStats';

const fixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, '..', '..', 'fixtures', name), 'utf8');

const GIB = 1024 ** 3;

describe('Linux', () => {
  it('counts memory in use as total minus MemAvailable', () => {
    const total = 64 * GIB;
    expect(parseMeminfo(fixture('linuxMeminfo.txt'), total)).toEqual({
      used: total - 27210892 * 1024,
      total,
    });
  });

  it('gives up on /proc/meminfo without MemAvailable', () => {
    expect(parseMeminfo('MemTotal: 100 kB\nMemFree: 50 kB\n', GIB)).toBeNull();
  });

  it('adds up real interfaces and skips loopback, bridges, docker and veth', () => {
    // enp6s0 and wlp5s0 only.
    expect(parseProcNetDev(fixture('linuxNetDev.txt'))).toEqual({
      rx: 1500000000 + 20000000,
      tx: 250000000 + 4000000,
    });
  });
});

describe('macOS', () => {
  it('counts app memory, wired and compressed pages, as Activity Monitor does', () => {
    const pages = 363223 - 3453 + 150239 + 180000;
    expect(parseVmStat(fixture('macVmStat.txt'), 16 * GIB)).toEqual({
      used: pages * 16384,
      total: 16 * GIB,
    });
  });

  it('never reports more memory in use than there is', () => {
    expect(parseVmStat(fixture('macVmStat.txt'), GIB).used).toBe(GIB);
  });

  it('adds up the link lines of real interfaces, counted from the right', () => {
    // en0 and en1. lo0, gif0*, utun0, awdl0 and bridge0 are skipped, and the IP line of en0 is
    // not a link line.
    expect(parseNetstat(fixture('macNetstat.txt'))).toEqual({
      rx: 5123456789 + 100000,
      tx: 678901234 + 50000,
    });
  });
});

describe('speed', () => {
  it('is bytes per second between two readings', () => {
    expect(speed(1000, 4000, 1.5)).toBe(2000);
  });

  it('is zero, never negative, when a counter resets', () => {
    expect(speed(5000, 100, 1.5)).toBe(0);
  });
});
