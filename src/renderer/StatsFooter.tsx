import type { ReactNode } from 'react';
import { cx } from './cx';
import { formatBytes } from './format';
import { CpuIcon, DownIcon, MemoryIcon, UpIcon } from './Icons';
import { useStats } from './useStats';

const UNKNOWN = 'Not available on this system';

interface StatProps {
  id: string;
  net?: boolean;
  title?: string;
  value: string;
  percent?: number;
  icon: ReactNode;
}

function Stat({ id, net, title, value, percent, icon }: StatProps) {
  const bar = !net;
  return (
    <div
      className={cx('stat', net && 'net', percent !== undefined && percent >= 85 && 'high')}
      id={id}
      title={title}
    >
      {icon}
      {bar && (
        <span className="stat-bar">
          <span style={percent !== undefined ? { width: `${percent.toFixed(1)}%` } : undefined} />
        </span>
      )}
      <span className="stat-value">{value}</span>
    </div>
  );
}

// CPU, memory, and download and upload speed. Main samples them every 1.5 seconds while the
// window is showing.
export function StatsFooter() {
  const sample = useStats();
  const cpu = sample?.cpu;
  const mem =
    sample && sample.memUsed !== null && sample.memTotal
      ? { used: sample.memUsed, total: sample.memTotal }
      : null;
  const memPercent = mem ? (mem.used / mem.total) * 100 : undefined;
  const speed = (value: number | null | undefined) =>
    value === null || value === undefined ? '-' : formatBytes(value, '/s');

  return (
    <footer className="sidebar-foot">
      <Stat
        id="stat-cpu"
        icon={<CpuIcon />}
        title={cpu !== undefined ? `CPU use: ${cpu.toFixed(1)}%` : undefined}
        value={cpu !== undefined ? `${Math.round(cpu)}%` : '-'}
        percent={cpu}
      />
      <Stat
        id="stat-down"
        net
        icon={<DownIcon />}
        title={sample && sample.down === null ? UNKNOWN : 'Download speed'}
        value={speed(sample?.down)}
      />
      <Stat
        id="stat-mem"
        icon={<MemoryIcon />}
        title={
          mem && memPercent !== undefined
            ? `Memory use: ${formatBytes(mem.used)} of ${formatBytes(mem.total)} (${Math.round(memPercent)}%)`
            : undefined
        }
        value={mem ? formatBytes(mem.used, '', true) : '-'}
        percent={memPercent}
      />
      <Stat
        id="stat-up"
        net
        icon={<UpIcon />}
        title={sample && sample.up === null ? UNKNOWN : 'Upload speed'}
        value={speed(sample?.up)}
      />
    </footer>
  );
}
