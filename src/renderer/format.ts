export function formatBytes(bytes: number, suffix = '', short = false): string {
  const units = short ? ['B', 'K', 'M', 'G', 'T'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  // Switch unit where the rounded number would reach 1000, so it never needs more than 3 digits.
  while (value >= 999.5 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // One decimal below 10, but not where it would round up to 10.0.
  const digits = unit === 0 || value >= 9.95 ? 0 : 1;
  return `${value.toFixed(digits)}${short ? '' : ' '}${units[unit]}${suffix}`;
}
