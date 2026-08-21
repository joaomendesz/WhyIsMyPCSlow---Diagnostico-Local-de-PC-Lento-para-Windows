import type {
  MetricsMonitorStatus,
  MetricsSnapshot,
  ProcessGroup,
  SystemInfo,
} from "../types/metrics";
import { requireDesktopBackend } from "./desktop";

export async function getSystemInfo(): Promise<SystemInfo> {
  return requireDesktopBackend().metrics.getSystemInfo();
}

export async function getLatestMetrics(): Promise<MetricsSnapshot> {
  return requireDesktopBackend().metrics.getLatestMetrics();
}

export async function getProcesses(): Promise<ProcessGroup[]> {
  return requireDesktopBackend().metrics.getProcesses();
}

export async function startMetricsStream(): Promise<MetricsMonitorStatus> {
  return requireDesktopBackend().metrics.startStream();
}

export async function stopMetricsStream(): Promise<MetricsMonitorStatus> {
  return requireDesktopBackend().metrics.stopStream();
}

export async function subscribeToMetricSnapshots(
  onSnapshot: (snapshot: MetricsSnapshot) => void,
): Promise<() => void> {
  return requireDesktopBackend().metrics.onSnapshot(onSnapshot);
}
