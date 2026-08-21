export const IpcChannels = {
  getSystemInfo: "metrics:get-system-info",
  getLatestMetrics: "metrics:get-latest",
  getProcesses: "metrics:get-processes",
  startMetricsStream: "metrics:start-stream",
  stopMetricsStream: "metrics:stop-stream",
  metricsSnapshot: "metrics:snapshot",
  startDiagnostic: "diagnostic:start",
  cancelDiagnostic: "diagnostic:cancel",
  diagnosticProgress: "diagnostic:progress",
  diagnosticFinished: "diagnostic:finished",
} as const;
