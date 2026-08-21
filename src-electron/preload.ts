import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { IpcChannels } from "./ipc";
import type {
  DiagnosticProgress,
  DiagnosticSummary,
  MetricsMonitorStatus,
  MetricsSnapshot,
  ProcessGroup,
  SystemInfo,
} from "./types";

contextBridge.exposeInMainWorld("whyPcSlow", {
  metrics: {
    getSystemInfo: () => ipcRenderer.invoke(IpcChannels.getSystemInfo) as Promise<SystemInfo>,
    getLatestMetrics: () =>
      ipcRenderer.invoke(IpcChannels.getLatestMetrics) as Promise<MetricsSnapshot>,
    getProcesses: () => ipcRenderer.invoke(IpcChannels.getProcesses) as Promise<ProcessGroup[]>,
    startStream: () =>
      ipcRenderer.invoke(IpcChannels.startMetricsStream) as Promise<MetricsMonitorStatus>,
    stopStream: () =>
      ipcRenderer.invoke(IpcChannels.stopMetricsStream) as Promise<MetricsMonitorStatus>,
    onSnapshot: (callback: (snapshot: MetricsSnapshot) => void) => {
      const listener = (_event: IpcRendererEvent, snapshot: MetricsSnapshot) => {
        callback(snapshot);
      };

      ipcRenderer.on(IpcChannels.metricsSnapshot, listener);

      return () => {
        ipcRenderer.removeListener(IpcChannels.metricsSnapshot, listener);
      };
    },
  },
  diagnostics: {
    startQuick: () =>
      ipcRenderer.invoke(IpcChannels.startDiagnostic, {
        mode: "quick",
      }) as Promise<DiagnosticSummary>,
    startComplete: () =>
      ipcRenderer.invoke(IpcChannels.startDiagnostic, {
        mode: "complete",
      }) as Promise<DiagnosticSummary>,
    cancel: () => ipcRenderer.invoke(IpcChannels.cancelDiagnostic) as Promise<DiagnosticProgress>,
    onProgress: (callback: (progress: DiagnosticProgress) => void) => {
      const listener = (_event: IpcRendererEvent, progress: DiagnosticProgress) => {
        callback(progress);
      };

      ipcRenderer.on(IpcChannels.diagnosticProgress, listener);

      return () => {
        ipcRenderer.removeListener(IpcChannels.diagnosticProgress, listener);
      };
    },
    onFinished: (callback: (summary: DiagnosticSummary) => void) => {
      const listener = (_event: IpcRendererEvent, summary: DiagnosticSummary) => {
        callback(summary);
      };

      ipcRenderer.on(IpcChannels.diagnosticFinished, listener);

      return () => {
        ipcRenderer.removeListener(IpcChannels.diagnosticFinished, listener);
      };
    },
  },
});
