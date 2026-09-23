const os = require('os');
const fs = require('fs/promises');
const { execFile } = require('child_process');

const SAMPLE_MS = 1500;

// Virtual and loopback interfaces repeat traffic that a real interface already counts.
const SKIP_INTERFACE = /^(lo|utun|gif|stf|bridge|awdl|llw|anpi|ap|ipsec|vmenet|vmnet|veth|docker|br-|virbr|tun|tap)/;

function run(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 2000 }, (error, stdout) => (error ? reject(error) : resolve(stdout)));
  });
}

function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

// Returns { used, total } in bytes. "Used" matches what Activity Monitor and `free` report,
// not total minus free, because the system keeps free memory busy as file cache.
async function memory() {
  const total = os.totalmem();

  if (process.platform === 'darwin') {
    const out = await run('/usr/bin/vm_stat', []);
    const pageSize = Number(/page size of (\d+)/.exec(out)?.[1] || 4096);
    const pages = (label) => Number(new RegExp(`${label}:\\s+(\\d+)`).exec(out)?.[1] || 0);
    // App memory + wired + compressed, the same parts Activity Monitor adds up.
    const used =
      (pages('Anonymous pages') - pages('Pages purgeable') + pages('Pages wired down') + pages('Pages occupied by compressor')) *
      pageSize;
    return { used: Math.min(total, Math.max(0, used)), total };
  }

  if (process.platform === 'linux') {
    const out = await fs.readFile('/proc/meminfo', 'utf8');
    const available = Number(/MemAvailable:\s+(\d+)/.exec(out)?.[1]) * 1024;
    if (available) return { used: total - available, total };
  }

  return { used: total - os.freemem(), total };
}

// Returns total bytes received and sent on real network interfaces, or null when unknown.
async function networkBytes() {
  let rx = 0;
  let tx = 0;

  if (process.platform === 'darwin') {
    const out = await run('/usr/sbin/netstat', ['-ibn']);
    for (const line of out.split('\n')) {
      if (!line.includes('<Link#')) continue;
      const cols = line.trim().split(/\s+/);
      if (SKIP_INTERFACE.test(cols[0])) continue;
      // Counted from the right, because the Address column can be empty.
      rx += Number(cols[cols.length - 5]) || 0;
      tx += Number(cols[cols.length - 2]) || 0;
    }
    return { rx, tx };
  }

  if (process.platform === 'linux') {
    const out = await fs.readFile('/proc/net/dev', 'utf8');
    for (const line of out.split('\n').slice(2)) {
      const [name, data] = line.split(':');
      if (!data || SKIP_INTERFACE.test(name.trim())) continue;
      const cols = data.trim().split(/\s+/);
      rx += Number(cols[0]) || 0;
      tx += Number(cols[8]) || 0;
    }
    return { rx, tx };
  }

  return null;
}

// Samples CPU, memory, and network speed on a timer and sends each sample.
class SystemStats {
  constructor(send) {
    this.send = send; // (stats) => void
    this.timer = null;
    this.busy = false;
    this.lastCpu = null;
    this.lastNet = null;
    this.lastTime = 0;
  }

  start() {
    if (this.timer) return;
    // Take a baseline now, so the first sample measures only the next interval.
    this.lastCpu = cpuTimes();
    this.lastTime = Date.now();
    networkBytes()
      .then((net) => (this.lastNet = net))
      .catch(() => {});
    this.timer = setInterval(() => this.sample(), SAMPLE_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  async sample() {
    if (this.busy) return;
    this.busy = true;
    try {
      const now = Date.now();
      const seconds = Math.max(0.001, (now - this.lastTime) / 1000);
      this.lastTime = now;

      const cpu = cpuTimes();
      const totalDelta = cpu.total - this.lastCpu.total;
      const cpuPercent = totalDelta > 0 ? (1 - (cpu.idle - this.lastCpu.idle) / totalDelta) * 100 : 0;
      this.lastCpu = cpu;

      const [mem, net] = await Promise.all([memory().catch(() => null), networkBytes().catch(() => null)]);

      let down = null;
      let up = null;
      if (net && this.lastNet) {
        // Counters can reset when an interface goes down, which would give a negative speed.
        down = Math.max(0, net.rx - this.lastNet.rx) / seconds;
        up = Math.max(0, net.tx - this.lastNet.tx) / seconds;
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

module.exports = { SystemStats };
