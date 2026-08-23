import type { MetricsSnapshot, ProcessGroup } from "../types";

interface SampleOptions {
  timestamp?: number;
  cpu?: number;
  memoryUsed?: number;
  availableBytes?: number;
  freePercent?: number;
  availableStorageBytes?: number;
  processGroups?: ProcessGroup[];
}

const TOTAL_MEMORY_BYTES = 8 * 1024 ** 3;
const TOTAL_STORAGE_BYTES = 256 * 1024 ** 3;

export function createSample(options: SampleOptions = {}): MetricsSnapshot {
  const availableBytes = options.availableBytes ?? 3 * 1024 ** 3;
  const memoryUsed = options.memoryUsed ?? 60;
  const availableStorageBytes = options.availableStorageBytes ?? 80 * 1024 ** 3;
  const freePercent = options.freePercent ?? 35;

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
    processGroups: options.processGroups ?? [
      {
        key: "chrome.exe",
        displayName: "Google Chrome",
        processCount: 8,
        totalCpuPercent: 12,
        totalMemoryBytes: 2 * 1024 ** 3,
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
