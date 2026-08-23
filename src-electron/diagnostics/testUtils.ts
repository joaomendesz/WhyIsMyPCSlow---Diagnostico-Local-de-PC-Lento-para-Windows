import type { MetricsSnapshot, ProcessGroup } from "../types";

interface SampleOptions {
  timestamp?: number;
  cpu?: number;
  memoryUsed?: number;
  availableBytes?: number;
  freePercent?: number;
  availableStorageBytes?: number;
  diskActivePercent?: number | null;
  diskReadBytesPerSecond?: number;
  diskWriteBytesPerSecond?: number;
  diskQueueLength?: number | null;
  processGroups?: ProcessGroup[];
}

const TOTAL_MEMORY_BYTES = 8 * 1024 ** 3;
const TOTAL_STORAGE_BYTES = 256 * 1024 ** 3;

export function createSample(options: SampleOptions = {}): MetricsSnapshot {
  const availableBytes = options.availableBytes ?? 3 * 1024 ** 3;
  const memoryUsed = options.memoryUsed ?? 60;
  const availableStorageBytes = options.availableStorageBytes ?? 80 * 1024 ** 3;
  const freePercent = options.freePercent ?? 35;
  const diskReadBytesPerSecond = options.diskReadBytesPerSecond ?? 2 * 1024 ** 2;
  const diskWriteBytesPerSecond = options.diskWriteBytesPerSecond ?? 1 * 1024 ** 2;

  return {
    timestamp: options.timestamp ?? Date.now(),
    cpu: {
      totalUsagePercent: options.cpu ?? 30,
      logicalProcessors: 8,
      physicalCores: 4,
      currentFrequencyMhz: 3200,
      maxFrequencyMhz: 4200,
    },
    memory: {
      totalBytes: TOTAL_MEMORY_BYTES,
      usedBytes: TOTAL_MEMORY_BYTES - availableBytes,
      availableBytes,
      usedPercent: memoryUsed,
    },
    diskActivity: {
      activePercent: options.diskActivePercent ?? 15,
      readBytesPerSecond: diskReadBytesPerSecond,
      writeBytesPerSecond: diskWriteBytesPerSecond,
      totalBytesPerSecond: diskReadBytesPerSecond + diskWriteBytesPerSecond,
      queueLength: options.diskQueueLength ?? 0.3,
      iops: 35,
      source: "powershell",
    },
    processGroups: options.processGroups ?? [
      {
        key: "chrome.exe",
        displayName: "Google Chrome",
        processCount: 8,
        totalCpuPercent: 12,
        totalMemoryBytes: 2 * 1024 ** 3,
        totalDiskReadBytesPerSecond: 512 * 1024,
        totalDiskWriteBytesPerSecond: 256 * 1024,
        totalDiskBytesPerSecond: 768 * 1024,
        processes: [],
      },
    ],
    storageVolumes: [
      {
        mount: "C:",
        fsType: "NTFS",
        sizeBytes: TOTAL_STORAGE_BYTES,
        usedBytes: TOTAL_STORAGE_BYTES - availableStorageBytes,
        availableBytes: availableStorageBytes,
        usedPercent: 100 - freePercent,
        freePercent,
        isSystemDrive: true,
      },
    ],
  };
}
