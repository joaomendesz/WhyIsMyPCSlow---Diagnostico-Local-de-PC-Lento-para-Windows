import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import si from "systeminformation";
import type {
  CpuSample,
  DiskActivitySample,
  MemorySample,
  MetricsMonitorStatus,
  MetricsSnapshot,
  ProcessGroup,
  ProcessSample,
  StorageVolume,
  SystemInfo,
} from "../types";
import { friendlyProcessName, normalizedProcessKey } from "./processNames";

const MAX_PROCESS_GROUPS = 20;
const STREAM_INTERVAL_MS = 1_000;
const PROCESS_CACHE_MS = 3_000;
const execFileAsync = promisify(execFile);

type CpuInfo = Awaited<ReturnType<typeof si.cpu>>;

interface RawProcessInfo {
  pid?: number;
  name?: string;
  cpu?: number;
  cpuTimeSeconds?: number;
  memRss?: number;
  memVsz?: number;
}

interface PowerShellProcessInfo {
  pid?: unknown;
  name?: unknown;
  cpu?: unknown;
  cpuTimeSeconds?: unknown;
  memRss?: unknown;
  memVsz?: unknown;
}

interface PowerShellStorageInfo {
  name?: unknown;
  root?: unknown;
  used?: unknown;
  free?: unknown;
}

interface PowerShellDiskActivityInfo {
  activePercent?: unknown;
  readBytesPerSecond?: unknown;
  writeBytesPerSecond?: unknown;
  queueLength?: unknown;
  readsPerSecond?: unknown;
  writesPerSecond?: unknown;
}

interface PowerShellProcessDiskInfo {
  pid?: unknown;
  readBytesPerSecond?: unknown;
  writeBytesPerSecond?: unknown;
}

export interface ProcessDiskRate {
  readBytesPerSecond: number;
  writeBytesPerSecond: number;
}

export type ProcessMemoryUnit = "bytes" | "kib";

export class MetricsService {
  private cpuInfo: CpuInfo | null = null;
  private processCache: { groups: ProcessGroup[]; expiresAt: number } | null = null;
  private processDiskRateCache: { rates: Map<number, ProcessDiskRate>; expiresAt: number } | null =
    null;
  private processDiskRateRefreshInFlight = false;
  private previousProcessCpu = new Map<number, { cpuTimeSeconds: number; timestamp: number }>();
  private timer: NodeJS.Timeout | null = null;
  private streamInFlight = false;

  async getSystemInfo(): Promise<SystemInfo> {
    const [osInfo, cpuInfo, memory] = await Promise.all([
      si.osInfo(),
      this.getCpuInfo(),
      si.mem(),
    ]);

    return {
      osName: osInfo.distro || osInfo.platform || null,
      osVersion: [osInfo.release, osInfo.build].filter(Boolean).join(" ") || null,
      kernelVersion: osInfo.kernel || null,
      hostName: os.hostname() || null,
      architecture: os.arch(),
      uptimeSeconds: Math.round(os.uptime()),
      totalMemoryBytes: memory.total,
      logicalProcessors: os.cpus().length,
      physicalCores: numberOrNull(cpuInfo.physicalCores),
    };
  }

  async getLatestMetrics(): Promise<MetricsSnapshot> {
    const [
      currentLoad,
      cpuInfo,
      memory,
      processes,
      storageVolumes,
      diskActivity,
    ] = await Promise.all([
      si.currentLoad(),
      this.getCpuInfo(),
      si.mem(),
      si.processes(),
      this.getStorageVolumes(),
      this.getDiskActivity(),
    ]);
    const processDiskRates = this.getCachedProcessDiskRates();

    return {
      timestamp: Date.now(),
      cpu: this.toCpuSample(currentLoad.currentLoad, cpuInfo),
      memory: this.toMemorySample(memory.total, memory.available),
      diskActivity,
      processGroups: await this.getProcessGroups(processes.list, processDiskRates),
      storageVolumes,
    };
  }

  async getProcesses(): Promise<ProcessGroup[]> {
    const snapshot = await this.getLatestMetrics();
    return snapshot.processGroups;
  }

  start(onSnapshot: (snapshot: MetricsSnapshot) => void): MetricsMonitorStatus {
    if (this.timer) {
      return { isRunning: true };
    }

    void this.emitSnapshot(onSnapshot);
    this.timer = setInterval(() => {
      void this.emitSnapshot(onSnapshot);
    }, STREAM_INTERVAL_MS);

    return { isRunning: true };
  }

  stop(): MetricsMonitorStatus {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    return { isRunning: false };
  }

  private async getCpuInfo(): Promise<CpuInfo> {
    if (!this.cpuInfo) {
      this.cpuInfo = await si.cpu();
    }

    return this.cpuInfo;
  }

  private async emitSnapshot(onSnapshot: (snapshot: MetricsSnapshot) => void): Promise<void> {
    if (this.streamInFlight) {
      return;
    }

    this.streamInFlight = true;

    try {
      onSnapshot(await this.getLatestMetrics());
    } catch (error) {
      console.warn("Failed to collect metrics snapshot", error);
    } finally {
      this.streamInFlight = false;
    }
  }

  private toCpuSample(totalUsagePercent: number, cpuInfo: CpuInfo): CpuSample {
    return {
      totalUsagePercent: clampPercent(totalUsagePercent),
      logicalProcessors: os.cpus().length,
      physicalCores: numberOrNull(cpuInfo.physicalCores),
      currentFrequencyMhz: ghzToMhz(cpuInfo.speed),
      maxFrequencyMhz: ghzToMhz(cpuInfo.speedMax),
    };
  }

  private toMemorySample(totalBytes: number, availableBytes: number): MemorySample {
    const usedBytes = Math.max(0, totalBytes - availableBytes);
    const usedPercent = totalBytes === 0 ? 0 : (usedBytes / totalBytes) * 100;

    return {
      totalBytes,
      usedBytes,
      availableBytes,
      usedPercent: clampPercent(usedPercent),
    };
  }

  private async getStorageVolumes(): Promise<StorageVolume[]> {
    try {
      const rows = await si.fsSize();
      const systemDrive = normalizedDrive(process.env.SystemDrive ?? "C:");
      const volumes = rows
        .filter((row) => row.size > 0)
        .map((row) => {
          const mount = row.mount || row.fs || "unknown";
          const sizeBytes = numberValue(row.size);
          const usedBytes = Math.min(sizeBytes, Math.max(0, numberValue(row.used)));
          const availableBytes = Math.max(0, numberValue(row.available));
          const usedPercent =
            typeof row.use === "number" && Number.isFinite(row.use)
              ? clampPercent(row.use)
              : sizeBytes === 0
                ? 0
                : clampPercent((usedBytes / sizeBytes) * 100);

          return {
            mount,
            fsType: row.type || null,
            sizeBytes,
            usedBytes,
            availableBytes,
            usedPercent,
            freePercent: clampPercent(100 - usedPercent),
            isSystemDrive: normalizedDrive(mount) === systemDrive,
          };
        })
        .sort((a, b) => Number(b.isSystemDrive) - Number(a.isSystemDrive));

      return volumes.length > 0 ? volumes : await collectStorageWithPowerShell(systemDrive);
    } catch (error) {
      console.warn("Failed to collect storage metrics", error);
      return collectStorageWithPowerShell(normalizedDrive(process.env.SystemDrive ?? "C:"));
    }
  }

  private async getDiskActivity(): Promise<DiskActivitySample> {
    if (process.platform === "win32") {
      return collectDiskActivityWithPowerShell();
    }

    return collectDiskActivityWithSystemInformation();
  }

  private getCachedProcessDiskRates(): Map<number, ProcessDiskRate> {
    if (process.platform !== "win32") {
      return new Map();
    }

    const now = Date.now();

    if (
      (!this.processDiskRateCache || this.processDiskRateCache.expiresAt <= now) &&
      !this.processDiskRateRefreshInFlight
    ) {
      this.processDiskRateRefreshInFlight = true;
      void collectProcessDiskRatesWithPowerShell()
        .then((rates) => {
          this.processDiskRateCache = {
            rates,
            expiresAt: Date.now() + 10_000,
          };
        })
        .finally(() => {
          this.processDiskRateRefreshInFlight = false;
        });
    }

    return this.processDiskRateCache?.rates ?? new Map();
  }

  private async getProcessGroups(
    processes: RawProcessInfo[],
    processDiskRates: Map<number, ProcessDiskRate>,
  ): Promise<ProcessGroup[]> {
    const systemInformationGroups = this.toProcessGroups(processes, "kib", processDiskRates);

    if (systemInformationGroups.length > 0) {
      this.processCache = {
        groups: systemInformationGroups,
        expiresAt: Date.now() + PROCESS_CACHE_MS,
      };
      return systemInformationGroups;
    }

    if (this.processCache && this.processCache.expiresAt > Date.now()) {
      return this.processCache.groups;
    }

    const fallbackGroups = await this.collectProcessesWithPowerShell(processDiskRates);
    this.processCache = {
      groups: fallbackGroups,
      expiresAt: Date.now() + PROCESS_CACHE_MS,
    };

    return fallbackGroups;
  }

  private async collectProcessesWithPowerShell(
    processDiskRates: Map<number, ProcessDiskRate>,
  ): Promise<ProcessGroup[]> {
    const script = `
$ErrorActionPreference = 'Stop'
Get-Process |
  ForEach-Object {
    $cpuTime = if ($null -eq $_.CPU) { 0 } else { [double]$_.CPU }
    [PSCustomObject]@{
      pid = [int]$_.Id
      name = [string]$_.ProcessName
      cpuTimeSeconds = $cpuTime
      memRss = [double]$_.WorkingSet64
      memVsz = [double]$_.VirtualMemorySize64
    }
  } |
  ConvertTo-Json -Compress -Depth 3
`;

    try {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
        {
          maxBuffer: 2 * 1024 * 1024,
          timeout: 8_000,
          windowsHide: true,
        },
      );

      const parsed = parsePowerShellProcesses(stdout);
      return this.toProcessGroups(this.withDerivedProcessCpu(parsed), "bytes", processDiskRates);
    } catch (error) {
      console.warn("Failed to collect process metrics through PowerShell fallback", error);
      return [];
    }
  }

  private withDerivedProcessCpu(processes: RawProcessInfo[]): RawProcessInfo[] {
    const now = Date.now();
    const logicalProcessors = os.cpus().length || 1;
    const nextCpuTimes = new Map<number, { cpuTimeSeconds: number; timestamp: number }>();

    const rowsWithCpu = processes.map((process) => {
      const pid = numberValue(process.pid);
      const cpuTimeSeconds = numberValue(process.cpuTimeSeconds);
      const previous = this.previousProcessCpu.get(pid);
      let cpu = 0;

      if (previous && cpuTimeSeconds >= previous.cpuTimeSeconds && now > previous.timestamp) {
        const elapsedSeconds = (now - previous.timestamp) / 1_000;
        const cpuSeconds = cpuTimeSeconds - previous.cpuTimeSeconds;
        cpu = (cpuSeconds / elapsedSeconds / logicalProcessors) * 100;
      }

      if (pid > 0) {
        nextCpuTimes.set(pid, { cpuTimeSeconds, timestamp: now });
      }

      return { ...process, cpu };
    });

    this.previousProcessCpu = nextCpuTimes;
    return rowsWithCpu;
  }

  private toProcessGroups(
    processes: RawProcessInfo[],
    memoryUnit: ProcessMemoryUnit,
    processDiskRates: Map<number, ProcessDiskRate>,
  ): ProcessGroup[] {
    const groups = new Map<string, ProcessGroup>();

    for (const process of processes) {
      const name = stringValue(process.name);

      if (!name) {
        continue;
      }

      const key = normalizedProcessKey(name);
      const friendlyName = friendlyProcessName(name);
      const pid = numberValue(process.pid);
      const diskRate = processDiskRates.get(pid);
      const diskReadBytesPerSecond = Math.max(
        0,
        numberValue(diskRate?.readBytesPerSecond),
      );
      const diskWriteBytesPerSecond = Math.max(
        0,
        numberValue(diskRate?.writeBytesPerSecond),
      );
      const sample: ProcessSample = {
        pid,
        name,
        friendlyName,
        cpuPercent: clampPercent(numberValue(process.cpu)),
        memoryBytes: processMemoryToBytes(process.memRss, memoryUnit),
        virtualMemoryBytes: processMemoryToBytes(process.memVsz, memoryUnit),
        diskReadBytesPerSecond,
        diskWriteBytesPerSecond,
        diskTotalBytesPerSecond: diskReadBytesPerSecond + diskWriteBytesPerSecond,
      };

      const existing = groups.get(key);
      if (existing) {
        existing.processCount += 1;
        existing.totalCpuPercent = clampPercent(existing.totalCpuPercent + sample.cpuPercent);
        existing.totalMemoryBytes += sample.memoryBytes;
        existing.totalDiskReadBytesPerSecond += sample.diskReadBytesPerSecond;
        existing.totalDiskWriteBytesPerSecond += sample.diskWriteBytesPerSecond;
        existing.totalDiskBytesPerSecond += sample.diskTotalBytesPerSecond;
        existing.processes.push(sample);
      } else {
        groups.set(key, {
          key,
          displayName: friendlyName,
          processCount: 1,
          totalCpuPercent: sample.cpuPercent,
          totalMemoryBytes: sample.memoryBytes,
          totalDiskReadBytesPerSecond: sample.diskReadBytesPerSecond,
          totalDiskWriteBytesPerSecond: sample.diskWriteBytesPerSecond,
          totalDiskBytesPerSecond: sample.diskTotalBytesPerSecond,
          processes: [sample],
        });
      }
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        processes: group.processes.sort((a, b) => b.memoryBytes - a.memoryBytes),
      }))
      .sort(
        (a, b) =>
          b.totalMemoryBytes - a.totalMemoryBytes ||
          b.totalDiskBytesPerSecond - a.totalDiskBytesPerSecond ||
          b.totalCpuPercent - a.totalCpuPercent,
      )
      .slice(0, MAX_PROCESS_GROUPS);
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function ghzToMhz(value: number | string | undefined): number | null {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;

  if (!parsed || !Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 1_000);
}

function numberOrNull(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numberOrNullValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function processMemoryToBytes(value: unknown, unit: ProcessMemoryUnit): number {
  const numericValue = Math.max(0, numberValue(value));

  if (unit === "kib") {
    return numericValue * 1024;
  }

  return numericValue;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedDrive(value: string): string {
  return value.trim().replace(/\\$/, "").toUpperCase();
}

function parsePowerShellProcesses(stdout: string): RawProcessInfo[] {
  const trimmed = stdout.trim();

  if (!trimmed) {
    return [];
  }

  const parsed: unknown = JSON.parse(trimmed);
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return rows.map((row): RawProcessInfo => {
    const process = row as PowerShellProcessInfo;

    return {
      pid: numberValue(process.pid),
      name: cleanPowerShellProcessName(stringValue(process.name)),
      cpu: numberValue(process.cpu),
      cpuTimeSeconds: numberValue(process.cpuTimeSeconds),
      memRss: numberValue(process.memRss),
      memVsz: numberValue(process.memVsz),
    };
  });
}

async function collectDiskActivityWithSystemInformation(): Promise<DiskActivitySample> {
  const [fsStatsResult, disksIoResult] = await Promise.allSettled([
    si.fsStats(),
    si.disksIO(),
  ]);
  const fsStats = fsStatsResult.status === "fulfilled" ? fsStatsResult.value : null;
  const disksIo = disksIoResult.status === "fulfilled" ? disksIoResult.value : null;

  if (!fsStats && !disksIo) {
    return unavailableDiskActivity();
  }

  const readBytesPerSecond = Math.max(0, numberValue(fsStats?.rx_sec));
  const writeBytesPerSecond = Math.max(0, numberValue(fsStats?.wx_sec));

  return {
    activePercent: clampNullablePercent(disksIo?.tWaitPercent),
    readBytesPerSecond,
    writeBytesPerSecond,
    totalBytesPerSecond: readBytesPerSecond + writeBytesPerSecond,
    queueLength: null,
    iops: numberOrNullValue(disksIo?.tIO_sec),
    source: "systeminformation",
  };
}

async function collectDiskActivityWithPowerShell(): Promise<DiskActivitySample> {
  const script = `
$ErrorActionPreference = 'Stop'
$disk = Get-CimInstance -ClassName Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'" | Select-Object -First 1
if ($null -eq $disk) {
  throw 'Disk performance counters unavailable.'
}
[PSCustomObject]@{
  activePercent = [double]$disk.PercentDiskTime
  readBytesPerSecond = [double]$disk.DiskReadBytesPersec
  writeBytesPerSecond = [double]$disk.DiskWriteBytesPersec
  queueLength = [double]$disk.CurrentDiskQueueLength
  readsPerSecond = [double]$disk.DiskReadsPersec
  writesPerSecond = [double]$disk.DiskWritesPersec
} | ConvertTo-Json -Compress -Depth 3
`;

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        maxBuffer: 3 * 1024 * 1024,
        timeout: 5_000,
        windowsHide: true,
      },
    );

    return parsePowerShellDiskActivity(stdout);
  } catch (error) {
    console.warn("Failed to collect disk activity metrics through PowerShell", error);
    return unavailableDiskActivity();
  }
}

export function parsePowerShellDiskActivity(stdout: string): DiskActivitySample {
  const trimmed = stdout.trim();

  if (!trimmed) {
    return unavailableDiskActivity();
  }

  const parsed = JSON.parse(trimmed) as PowerShellDiskActivityInfo;
  return toPowerShellDiskActivity(parsed);
}

export function parsePowerShellProcessDiskRates(stdout: string): Map<number, ProcessDiskRate> {
  const trimmed = stdout.trim();

  if (!trimmed) {
    return new Map();
  }

  const parsed: unknown = JSON.parse(trimmed);
  return toProcessDiskRates(parsed);
}

async function collectProcessDiskRatesWithPowerShell(): Promise<Map<number, ProcessDiskRate>> {
  const script = `
$ErrorActionPreference = 'Stop'
Get-CimInstance -ClassName Win32_PerfFormattedData_PerfProc_Process |
  Where-Object { $_.IDProcess -gt 0 -and $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } |
  ForEach-Object {
    [PSCustomObject]@{
      pid = [int]$_.IDProcess
      readBytesPerSecond = [double]$_.IOReadBytesPersec
      writeBytesPerSecond = [double]$_.IOWriteBytesPersec
    }
  } |
  ConvertTo-Json -Compress -Depth 3
`;

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        maxBuffer: 3 * 1024 * 1024,
        timeout: 8_000,
        windowsHide: true,
      },
    );

    return parsePowerShellProcessDiskRates(stdout);
  } catch (error) {
    console.warn("Failed to collect per-process disk metrics through PowerShell", error);
    return new Map();
  }
}

function toPowerShellDiskActivity(value: unknown): DiskActivitySample {
  const parsed = value as PowerShellDiskActivityInfo;
  const readBytesPerSecond = Math.max(0, numberValue(parsed.readBytesPerSecond));
  const writeBytesPerSecond = Math.max(0, numberValue(parsed.writeBytesPerSecond));
  const readsPerSecond = Math.max(0, numberValue(parsed.readsPerSecond));
  const writesPerSecond = Math.max(0, numberValue(parsed.writesPerSecond));

  return {
    activePercent: clampNullablePercent(parsed.activePercent),
    readBytesPerSecond,
    writeBytesPerSecond,
    totalBytesPerSecond: readBytesPerSecond + writeBytesPerSecond,
    queueLength: numberOrNullValue(parsed.queueLength),
    iops: readsPerSecond + writesPerSecond,
    source: "powershell",
  };
}

function toProcessDiskRates(value: unknown): Map<number, ProcessDiskRate> {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  const rates = new Map<number, ProcessDiskRate>();

  for (const row of rows) {
    const diskInfo = row as PowerShellProcessDiskInfo;
    const pid = numberValue(diskInfo.pid);

    if (pid <= 0) {
      continue;
    }

    rates.set(pid, {
      readBytesPerSecond: Math.max(0, numberValue(diskInfo.readBytesPerSecond)),
      writeBytesPerSecond: Math.max(0, numberValue(diskInfo.writeBytesPerSecond)),
    });
  }

  return rates;
}

function unavailableDiskActivity(): DiskActivitySample {
  return {
    activePercent: null,
    readBytesPerSecond: 0,
    writeBytesPerSecond: 0,
    totalBytesPerSecond: 0,
    queueLength: null,
    iops: null,
    source: "unavailable",
  };
}

async function collectStorageWithPowerShell(systemDrive: string): Promise<StorageVolume[]> {
  const script = `
$ErrorActionPreference = 'Stop'
Get-PSDrive -PSProvider FileSystem |
  Where-Object { $_.Root -match '^[A-Za-z]:\\\\$' } |
  ForEach-Object {
    [PSCustomObject]@{
      name = [string]$_.Name
      root = [string]$_.Root
      used = [double]$_.Used
      free = [double]$_.Free
    }
  } |
  ConvertTo-Json -Compress -Depth 3
`;

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        maxBuffer: 512 * 1024,
        timeout: 5_000,
        windowsHide: true,
      },
    );

    return parsePowerShellStorage(stdout, systemDrive);
  } catch (error) {
    console.warn("Failed to collect storage metrics through PowerShell fallback", error);
    return [];
  }
}

function parsePowerShellStorage(stdout: string, systemDrive: string): StorageVolume[] {
  const trimmed = stdout.trim();

  if (!trimmed) {
    return [];
  }

  const parsed: unknown = JSON.parse(trimmed);
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return rows
    .map((row): StorageVolume | null => {
      const volume = row as PowerShellStorageInfo;
      const name = stringValue(volume.name);
      const usedBytes = Math.max(0, numberValue(volume.used));
      const availableBytes = Math.max(0, numberValue(volume.free));
      const sizeBytes = usedBytes + availableBytes;

      if (!name || sizeBytes <= 0) {
        return null;
      }

      const mount = `${name.toUpperCase()}:`;
      const usedPercent = clampPercent((usedBytes / sizeBytes) * 100);

      return {
        mount,
        fsType: null,
        sizeBytes,
        usedBytes,
        availableBytes,
        usedPercent,
        freePercent: clampPercent(100 - usedPercent),
        isSystemDrive: normalizedDrive(mount) === systemDrive,
      };
    })
    .filter((volume): volume is StorageVolume => Boolean(volume))
    .sort((a, b) => Number(b.isSystemDrive) - Number(a.isSystemDrive));
}

function clampNullablePercent(value: unknown): number | null {
  const numericValue = numberOrNullValue(value);

  return numericValue === null ? null : clampPercent(numericValue);
}

function cleanPowerShellProcessName(name: string): string {
  const withoutInstanceSuffix = name.replace(/#\d+$/, "");
  if (!withoutInstanceSuffix) {
    return "";
  }

  return withoutInstanceSuffix.endsWith(".exe")
    ? withoutInstanceSuffix
    : `${withoutInstanceSuffix}.exe`;
}
