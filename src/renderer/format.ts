export function formatBytes(bytes: number, suffix = '', short = false): string {
  const units = short ? ['B', 'K', 'M', 'G', 'T'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  // Switch unit at 1000, so the number never needs more than 3 digits.
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)}${short ? '' : ' '}${units[unit]}${suffix}`;
}
