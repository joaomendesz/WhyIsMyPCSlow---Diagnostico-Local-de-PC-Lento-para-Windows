import type {
  DiagnosticTimelineSample,
  MetricsSnapshot,
  ProcessGroup,
  StorageVolume,
} from "../types";

export function buildDiagnosticTimeline(
  samples: MetricsSnapshot[],
): DiagnosticTimelineSample[] {
  const firstTimestamp = samples[0]?.timestamp ?? 0;

  return samples.map((sample) => {
    const systemDrive = getSystemDrive(sample.storageVolumes);
    const topCpuProcess = getTopProcessByCpu(sample.processGroups);
    const topMemoryProcess = getTopProcessByMemory(sample.processGroups);
    const topDiskProcess = getTopProcessByDisk(sample.processGroups);

    return {
      timestamp: sample.timestamp,
      offsetSeconds: roundMetric((sample.timestamp - firstTimestamp) / 1_000),
      cpuUsagePercent: roundMetric(sample.cpu.totalUsagePercent),
      memoryUsedPercent: roundMetric(sample.memory.usedPercent),
      memoryAvailableBytes: Math.round(sample.memory.availableBytes),
      diskActivePercent:
        sample.diskActivity.activePercent === null
          ? null
          : roundMetric(sample.diskActivity.activePercent),
      diskReadBytesPerSecond: Math.round(sample.diskActivity.readBytesPerSecond),
      diskWriteBytesPerSecond: Math.round(sample.diskActivity.writeBytesPerSecond),
      diskTotalBytesPerSecond: Math.round(sample.diskActivity.totalBytesPerSecond),
      diskQueueLength:
        sample.diskActivity.queueLength === null
          ? null
          : roundMetric(sample.diskActivity.queueLength),
      systemDriveFreePercent: systemDrive ? roundMetric(systemDrive.freePercent) : null,
      systemDriveAvailableBytes: systemDrive ? Math.round(systemDrive.availableBytes) : null,
      topCpuProcessName: topCpuProcess?.displayName ?? null,
      topCpuProcessPercent: topCpuProcess
        ? roundMetric(topCpuProcess.totalCpuPercent)
        : null,
      topMemoryProcessName: topMemoryProcess?.displayName ?? null,
      topMemoryProcessBytes: topMemoryProcess
        ? Math.round(topMemoryProcess.totalMemoryBytes)
        : null,
      topDiskProcessName: topDiskProcess?.displayName ?? null,
      topDiskProcessBytesPerSecond: topDiskProcess
        ? Math.round(topDiskProcess.totalDiskBytesPerSecond)
        : null,
    };
  });
}

function getSystemDrive(volumes: StorageVolume[]): StorageVolume | null {
  return volumes.find((volume) => volume.isSystemDrive) ?? volumes[0] ?? null;
}

function getTopProcessByCpu(processGroups: ProcessGroup[]): ProcessGroup | null {
  return [...processGroups].sort(
    (a, b) => b.totalCpuPercent - a.totalCpuPercent || b.totalMemoryBytes - a.totalMemoryBytes,
  )[0] ?? null;
}

function getTopProcessByMemory(processGroups: ProcessGroup[]): ProcessGroup | null {
  return [...processGroups].sort(
    (a, b) => b.totalMemoryBytes - a.totalMemoryBytes || b.totalCpuPercent - a.totalCpuPercent,
  )[0] ?? null;
}

function getTopProcessByDisk(processGroups: ProcessGroup[]): ProcessGroup | null {
  return [...processGroups].sort(
    (a, b) =>
      b.totalDiskBytesPerSecond - a.totalDiskBytesPerSecond ||
      b.totalCpuPercent - a.totalCpuPercent,
  )[0] ?? null;
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
}
