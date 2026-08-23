export type DiagnosticStatus =
  | "idle"
  | "preparing"
  | "collecting"
  | "analyzing"
  | "completed"
  | "cancelled"
  | "failed";

export type DiagnosticImpact = "low" | "medium" | "high";

export type DiagnosticCategory = "cpu" | "memory" | "storage" | "disk" | "process";

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
  diskReadBytesPerSecond?: number;
  diskWriteBytesPerSecond?: number;
  diskTotalBytesPerSecond?: number;
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

export interface DiagnosticTimelineSample {
  timestamp: number;
  offsetSeconds: number;
  cpuUsagePercent: number;
  memoryUsedPercent: number;
  memoryAvailableBytes: number;
  diskActivePercent: number | null;
  diskReadBytesPerSecond: number;
  diskWriteBytesPerSecond: number;
  diskTotalBytesPerSecond: number;
  diskQueueLength: number | null;
  systemDriveFreePercent: number | null;
  systemDriveAvailableBytes: number | null;
  topCpuProcessName: string | null;
  topCpuProcessPercent: number | null;
  topMemoryProcessName: string | null;
  topMemoryProcessBytes: number | null;
  topDiskProcessName: string | null;
  topDiskProcessBytesPerSecond: number | null;
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
  timeline: DiagnosticTimelineSample[];
}

export interface DiagnosticProgress {
  status: DiagnosticStatus;
  progressPercent: number;
  message: string;
  elapsedSeconds: number;
  durationSeconds: number;
  samplesCollected: number;
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

export type DiagnosticReportFormat = "markdown" | "html";

export interface ExportDiagnosticReportResult {
  cancelled: boolean;
  filePath: string | null;
  format: DiagnosticReportFormat;
}
