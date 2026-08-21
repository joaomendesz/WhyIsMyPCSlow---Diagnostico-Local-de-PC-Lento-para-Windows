const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  const absValue = Math.abs(value);
  if (absValue < 1024) {
    return `${Math.round(value)} B`;
  }

  let unitIndex = 0;
  let scaled = value;

  while (Math.abs(scaled) >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }

  const precision = scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(precision)} ${BYTE_UNITS[unitIndex]}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  return `${Math.round(value)}%`;
}

export function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "--";
  }

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  const minutes = Math.floor((seconds % 3_600) / 60);
  return `${hours}h ${minutes}m`;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}
