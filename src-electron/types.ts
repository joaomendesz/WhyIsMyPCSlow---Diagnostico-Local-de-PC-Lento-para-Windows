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
}

export interface ProcessGroup {
  key: string;
  displayName: string;
  processCount: number;
  totalCpuPercent: number;
  totalMemoryBytes: number;
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

export interface MetricsSnapshot {
  timestamp: number;
  cpu: CpuSample;
  memory: MemorySample;
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

export type DiagnosticStatus =
  | "idle"
  | "preparing"
  | "collecting"
  | "analyzing"
  | "completed"
  | "cancelled"
  | "failed";

export type DiagnosticImpact = "low" | "medium" | "high";

export type DiagnosticCategory = "cpu" | "memory" | "storage" | "process";

export interface DiagnosticEvidence {
  label: string;
  value: string;
  detail: string;
}

export interface DiagnosticRecommendation {
  title: string;
  detail: string;
}

export interface DiagnosticRelatedProcess {
  name: string;
  cpuPercent: number;
  memoryBytes: number;
}

export interface DiagnosticFinding {
  id: string;
  category: DiagnosticCategory;
  title: string;
  explanation: string;
  impact: DiagnosticImpact;
  confidence: number;
  evidence: DiagnosticEvidence[];
  recommendations: DiagnosticRecommendation[];
  relatedProcesses: DiagnosticRelatedProcess[];
}

export interface DiagnosticCheck {
  id: string;
  title: string;
  detail: string;
}

export type DiagnosticSummaryStatus = "healthy" | "issuesFound" | "inconclusive";

export interface DiagnosticSummary {
  status: DiagnosticSummaryStatus;
  primaryFinding: DiagnosticFinding | null;
  secondaryFindings: DiagnosticFinding[];
  positiveChecks: DiagnosticCheck[];
  analyzedAt: string;
  sampleCount: number;
  durationSeconds: number;
  engineVersion: string;
}

export interface DiagnosticProgress {
  status: DiagnosticStatus;
  progressPercent: number;
  message: string;
  elapsedSeconds: number;
  durationSeconds: number;
  samplesCollected: number;
}

export interface StartDiagnosticRequest {
  mode: "quick" | "complete";
}

export interface DiagnosticHistoryItem {
  id: string;
  analyzedAt: string;
  status: DiagnosticSummaryStatus;
  primaryFindingTitle: string | null;
  primaryFindingCategory: DiagnosticCategory | null;
  primaryFindingImpact: DiagnosticImpact | null;
  primaryFindingConfidence: number | null;
  sampleCount: number;
  durationSeconds: number;
  engineVersion: string;
  createdAt: string;
}

export interface DiagnosticHistoryDetail extends DiagnosticHistoryItem {
  summary: DiagnosticSummary;
}
