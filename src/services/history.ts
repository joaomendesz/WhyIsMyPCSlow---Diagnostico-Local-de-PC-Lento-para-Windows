import type { DiagnosticHistoryDetail, DiagnosticHistoryItem } from "../types/diagnostics";
import { requireDesktopBackend } from "./desktop";

export async function listDiagnosticHistory(): Promise<DiagnosticHistoryItem[]> {
  return requireDesktopBackend().history.list();
}

export async function getDiagnosticHistoryDetail(
  id: string,
): Promise<DiagnosticHistoryDetail | null> {
  return requireDesktopBackend().history.get(id);
}

export async function clearDiagnosticHistory(): Promise<{ deletedCount: number }> {
  return requireDesktopBackend().history.clear();
}
