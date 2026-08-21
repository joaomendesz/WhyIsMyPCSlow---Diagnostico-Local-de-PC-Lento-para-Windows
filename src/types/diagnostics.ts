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
