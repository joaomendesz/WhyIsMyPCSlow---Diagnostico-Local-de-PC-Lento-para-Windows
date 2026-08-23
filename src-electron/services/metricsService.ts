import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import si from "systeminformation";
import type {
  CpuSample,
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

type ProcessMemoryUnit = "bytes" | "kib";

export class MetricsService {
  private cpuInfo: CpuInfo | null = null;
  private processCache: { groups: ProcessGroup[]; expiresAt: number } | null = null;
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
    const [currentLoad, cpuInfo, memory, processes, storageVolumes] = await Promise.all([
      si.currentLoad(),
      this.getCpuInfo(),
      si.mem(),
      si.processes(),
      this.getStorageVolumes(),
    ]);

    return {
      timestamp: Date.now(),
      cpu: this.toCpuSample(currentLoad.currentLoad, cpuInfo),
      memory: this.toMemorySample(memory.total, memory.available),
      processGroups: await this.getProcessGroups(processes.list),
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

  private async getProcessGroups(processes: RawProcessInfo[]): Promise<ProcessGroup[]> {
    const systemInformationGroups = this.toProcessGroups(processes, "kib");

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

    const fallbackGroups = await this.collectProcessesWithPowerShell();
    this.processCache = {
      groups: fallbackGroups,
      expiresAt: Date.now() + PROCESS_CACHE_MS,
    };

    return fallbackGroups;
  }

  private async collectProcessesWithPowerShell(): Promise<ProcessGroup[]> {
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
      return this.toProcessGroups(this.withDerivedProcessCpu(parsed), "bytes");
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
  ): ProcessGroup[] {
    const groups = new Map<string, ProcessGroup>();

    for (const process of processes) {
      const name = stringValue(process.name);

      if (!name) {
        continue;
      }

      const key = normalizedProcessKey(name);
      const friendlyName = friendlyProcessName(name);
      const sample: ProcessSample = {
        pid: numberValue(process.pid),
        name,
        friendlyName,
        cpuPercent: clampPercent(numberValue(process.cpu)),
        memoryBytes: processMemoryToBytes(process.memRss, memoryUnit),
        virtualMemoryBytes: processMemoryToBytes(process.memVsz, memoryUnit),
      };

      const existing = groups.get(key);
      if (existing) {
        existing.processCount += 1;
        existing.totalCpuPercent = clampPercent(existing.totalCpuPercent + sample.cpuPercent);
        existing.totalMemoryBytes += sample.memoryBytes;
        existing.processes.push(sample);
      } else {
        groups.set(key, {
          key,
          displayName: friendlyName,
          processCount: 1,
          totalCpuPercent: sample.cpuPercent,
          totalMemoryBytes: sample.memoryBytes,
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

function cleanPowerShellProcessName(name: string): string {
  const withoutInstanceSuffix = name.replace(/#\d+$/, "");
  if (!withoutInstanceSuffix) {
    return "";
  }

  return withoutInstanceSuffix.endsWith(".exe")
    ? withoutInstanceSuffix
    : `${withoutInstanceSuffix}.exe`;
}
