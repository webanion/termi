import os from 'os';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import type { StatsSample } from '../shared/types';

const SAMPLE_MS = 1500;

// Virtual and loopback interfaces repeat traffic that a real interface already counts.
const SKIP_INTERFACE =
  /^(lo|utun|gif|stf|bridge|awdl|llw|anpi|ap|ipsec|vmenet|vmnet|veth|docker|br-|virbr|tun|tap)/;

interface CpuTimes {
  idle: number;
  total: number;
}

export interface Memory {
  used: number;
  total: number;
}

export interface NetworkBytes {
  rx: number;
  tx: number;
}

function run(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 2000 }, (error, stdout) =>
      error ? reject(error) : resolve(stdout),
    );
  });
}

function cpuTimes(): CpuTimes {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

// Memory in use from `vm_stat` on macOS: app memory, wired and compressed, the same parts
// Activity Monitor adds up.
export function parseVmStat(out: string, total: number): Memory {
  const pageSize = Number(/page size of (\d+)/.exec(out)?.[1] || 4096);
  const pages = (label: string) => Number(new RegExp(`${label}:\\s+(\\d+)`).exec(out)?.[1] || 0);
  const used =
    (pages('Anonymous pages') -
      pages('Pages purgeable') +
      pages('Pages wired down') +
      pages('Pages occupied by compressor')) *
    pageSize;
  return { used: Math.min(total, Math.max(0, used)), total };
}

// Memory in use from /proc/meminfo on Linux, or null when it has no MemAvailable line.
export function parseMeminfo(out: string, total: number): Memory | null {
  const available = Number(/MemAvailable:\s+(\d+)/.exec(out)?.[1]) * 1024;
  return available ? { used: total - available, total } : null;
}

// Bytes received and sent on real interfaces, from `netstat -ibn` on macOS.
export function parseNetstat(out: string): NetworkBytes {
  let rx = 0;
  let tx = 0;
  for (const line of out.split('\n')) {
    if (!line.includes('<Link#')) continue;
    const cols = line.trim().split(/\s+/);
    if (SKIP_INTERFACE.test(cols[0] ?? '')) continue;
    // Counted from the right, because the Address column can be empty.
    rx += Number(cols[cols.length - 5]) || 0;
    tx += Number(cols[cols.length - 2]) || 0;
  }
  return { rx, tx };
}

// Bytes received and sent on real interfaces, from /proc/net/dev on Linux.
export function parseProcNetDev(out: string): NetworkBytes {
  let rx = 0;
  let tx = 0;
  for (const line of out.split('\n').slice(2)) {
    const [name = '', data] = line.split(':');
    if (!data || SKIP_INTERFACE.test(name.trim())) continue;
    const cols = data.trim().split(/\s+/);
    rx += Number(cols[0]) || 0;
    tx += Number(cols[8]) || 0;
  }
  return { rx, tx };
}

// Bytes per second between two readings. Counters can reset when an interface goes down, which
// would give a negative speed, so a drop counts as zero.
export function speed(before: number, after: number, seconds: number): number {
  return Math.max(0, after - before) / seconds;
}

// Returns { used, total } in bytes. "Used" matches what Activity Monitor and `free` report,
// not total minus free, because the system keeps free memory busy as file cache.
async function memory(): Promise<Memory> {
  const total = os.totalmem();
  if (process.platform === 'darwin') return parseVmStat(await run('/usr/bin/vm_stat', []), total);
  if (process.platform === 'linux') {
    const parsed = parseMeminfo(await fs.readFile('/proc/meminfo', 'utf8'), total);
    if (parsed) return parsed;
  }
  return { used: total - os.freemem(), total };
}

// Returns total bytes received and sent on real network interfaces, or null when unknown.
async function networkBytes(): Promise<NetworkBytes | null> {
  if (process.platform === 'darwin') return parseNetstat(await run('/usr/sbin/netstat', ['-ibn']));
  if (process.platform === 'linux')
    return parseProcNetDev(await fs.readFile('/proc/net/dev', 'utf8'));
  return null;
}

// Samples CPU, memory, and network speed on a timer and sends each sample.
export class SystemStats {
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  private lastCpu: CpuTimes = { idle: 0, total: 0 };
  private lastNet: NetworkBytes | null = null;
  private lastTime = 0;

  constructor(private readonly send: (sample: StatsSample) => void) {}

  start(): void {
    if (this.timer) return;
    // Take a baseline now, so the first sample measures only the next interval.
    this.lastCpu = cpuTimes();
    this.lastTime = Date.now();
    networkBytes()
      .then((net) => (this.lastNet = net))
      .catch(() => {});
    this.timer = setInterval(() => this.sample(), SAMPLE_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async sample(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const now = Date.now();
      const seconds = Math.max(0.001, (now - this.lastTime) / 1000);
      this.lastTime = now;

      const cpu = cpuTimes();
      const totalDelta = cpu.total - this.lastCpu.total;
      const cpuPercent =
        totalDelta > 0 ? (1 - (cpu.idle - this.lastCpu.idle) / totalDelta) * 100 : 0;
      this.lastCpu = cpu;

      const [mem, net] = await Promise.all([
        memory().catch(() => null),
        networkBytes().catch(() => null),
      ]);

      let down: number | null = null;
      let up: number | null = null;
      if (net && this.lastNet) {
        down = speed(this.lastNet.rx, net.rx, seconds);
        up = speed(this.lastNet.tx, net.tx, seconds);
      }
      this.lastNet = net;

      this.send({
        cpu: Math.min(100, Math.max(0, cpuPercent)),
        memUsed: mem?.used ?? null,
        memTotal: mem?.total ?? null,
        down,
        up,
      });
    } finally {
      this.busy = false;
    }
  }
}
