import type { DiagnosticProgress, DiagnosticSummary } from "../types/diagnostics";
import { requireDesktopBackend } from "./desktop";

export async function startQuickDiagnostic(): Promise<DiagnosticSummary> {
  return requireDesktopBackend().diagnostics.startQuick();
}

export async function startCompleteDiagnostic(): Promise<DiagnosticSummary> {
  return requireDesktopBackend().diagnostics.startComplete();
}

export async function cancelDiagnostic(): Promise<DiagnosticProgress> {
  return requireDesktopBackend().diagnostics.cancel();
}

export async function subscribeDiagnosticProgress(
  onProgress: (progress: DiagnosticProgress) => void,
): Promise<() => void> {
  return requireDesktopBackend().diagnostics.onProgress(onProgress);
}

export async function subscribeDiagnosticFinished(
  onFinished: (summary: DiagnosticSummary) => void,
): Promise<() => void> {
  return requireDesktopBackend().diagnostics.onFinished(onFinished);
}
