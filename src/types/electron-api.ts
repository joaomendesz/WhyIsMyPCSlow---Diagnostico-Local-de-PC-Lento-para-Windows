import type {
  MetricsMonitorStatus,
  MetricsSnapshot,
  ProcessGroup,
  SystemInfo,
} from "./metrics";
import type {
  DiagnosticHistoryDetail,
  DiagnosticHistoryItem,
  DiagnosticProgress,
  DiagnosticReportFormat,
  DiagnosticSummary,
  ExportDiagnosticReportResult,
} from "./diagnostics";

export interface WhyPcSlowApi {
  metrics: {
    getSystemInfo: () => Promise<SystemInfo>;
    getLatestMetrics: () => Promise<MetricsSnapshot>;
    getProcesses: () => Promise<ProcessGroup[]>;
    startStream: () => Promise<MetricsMonitorStatus>;
    stopStream: () => Promise<MetricsMonitorStatus>;
    onSnapshot: (callback: (snapshot: MetricsSnapshot) => void) => () => void;
  };
  diagnostics: {
    startQuick: () => Promise<DiagnosticSummary>;
    startComplete: () => Promise<DiagnosticSummary>;
    cancel: () => Promise<DiagnosticProgress>;
    onProgress: (callback: (progress: DiagnosticProgress) => void) => () => void;
    onFinished: (callback: (summary: DiagnosticSummary) => void) => () => void;
  };
  history: {
    list: () => Promise<DiagnosticHistoryItem[]>;
    get: (id: string) => Promise<DiagnosticHistoryDetail | null>;
    exportReport: (
      id: string,
      format: DiagnosticReportFormat,
    ) => Promise<ExportDiagnosticReportResult>;
    clear: () => Promise<{ deletedCount: number }>;
  };
}

declare global {
  interface Window {
    whyPcSlow?: WhyPcSlowApi;
  }
}

export {};
