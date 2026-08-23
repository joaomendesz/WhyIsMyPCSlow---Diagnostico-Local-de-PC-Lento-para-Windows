export interface CpuSample {
  totalUsagePercent: number;
  logicalProcessors: number;
  physicalCores: number | null;
  currentFrequencyMhz: number | null;
  maxFrequencyMhz: number | null;
}

export interface MemorySample {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
}

export interface ProcessSample {
  pid: number;
  name: string;
  friendlyName: string;
  cpuPercent: number;
  memoryBytes: number;
  virtualMemoryBytes: number;
  diskReadBytesPerSecond: number;
  diskWriteBytesPerSecond: number;
  diskTotalBytesPerSecond: number;
}

export interface ProcessGroup {
  key: string;
  displayName: string;
  processCount: number;
  totalCpuPercent: number;
  totalMemoryBytes: number;
  totalDiskReadBytesPerSecond: number;
  totalDiskWriteBytesPerSecond: number;
  totalDiskBytesPerSecond: number;
  processes: ProcessSample[];
}

export interface StorageVolume {
  mount: string;
  fsType: string | null;
  sizeBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  freePercent: number;
  isSystemDrive: boolean;
}

export interface DiskActivitySample {
  activePercent: number | null;
  readBytesPerSecond: number;
  writeBytesPerSecond: number;
  totalBytesPerSecond: number;
  queueLength: number | null;
  iops: number | null;
  source: "systeminformation" | "powershell" | "unavailable";
}

export interface MetricsSnapshot {
  timestamp: number;
  cpu: CpuSample;
  memory: MemorySample;
  diskActivity: DiskActivitySample;
  processGroups: ProcessGroup[];
  storageVolumes: StorageVolume[];
}

export interface SystemInfo {
  osName: string | null;
  osVersion: string | null;
  kernelVersion: string | null;
  hostName: string | null;
  architecture: string;
  uptimeSeconds: number;
  totalMemoryBytes: number;
  logicalProcessors: number;
  physicalCores: number | null;
}

export interface MetricsMonitorStatus {
  isRunning: boolean;
}
