import type {
  DiagnosticHistoryDetail,
  DiagnosticHistoryItem,
  DiagnosticReportFormat,
  ExportDiagnosticReportResult,
} from "../types/diagnostics";
import { requireDesktopBackend } from "./desktop";

export async function listDiagnosticHistory(): Promise<DiagnosticHistoryItem[]> {
  return requireDesktopBackend().history.list();
}

export async function getDiagnosticHistoryDetail(
  id: string,
): Promise<DiagnosticHistoryDetail | null> {
  return requireDesktopBackend().history.get(id);
}

export async function exportDiagnosticReport(
  id: string,
  format: DiagnosticReportFormat,
): Promise<ExportDiagnosticReportResult> {
  return requireDesktopBackend().history.exportReport(id, format);
}

export async function clearDiagnosticHistory(): Promise<{ deletedCount: number }> {
  return requireDesktopBackend().history.clear();
}
