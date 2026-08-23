import { describe, expect, it } from "vitest";
import { buildDiagnosticReport, createDiagnosticReportFileName } from "./diagnosticReport";
import type { DiagnosticHistoryDetail } from "../types";

describe("diagnostic report builder", () => {
  it("builds a markdown report with findings, recommendations and timeline metrics", () => {
    const report = buildDiagnosticReport(createDetail(), "markdown");

    expect(report.extension).toBe("md");
    expect(report.mimeType).toBe("text/markdown");
    expect(report.content).toContain("# WhyIsMyPCSlow - Relatorio de Diagnostico");
    expect(report.content).toContain("Memoria RAM permaneceu sob pressao");
    expect(report.content).toContain("Google Chrome");
    expect(report.content).toContain("3.00 GB");
    expect(report.content).toContain("12.0 MB/s");
    expect(report.content).toContain("Feche apps pesados");
    expect(report.content).toContain("Amostras representativas: 2 de 2.");
  });

  it("builds an escaped standalone html report", () => {
    const detail = createDetail();
    detail.summary.primaryFinding!.relatedProcesses[0]!.name = "App <script>";

    const report = buildDiagnosticReport(detail, "html");

    expect(report.extension).toBe("html");
    expect(report.mimeType).toBe("text/html");
    expect(report.content).toContain("<!doctype html>");
    expect(report.content).toContain("App &lt;script&gt;");
    expect(report.content).not.toContain("App <script>");
  });

  it("creates a predictable safe file name", () => {
    const detail = createDetail();
    detail.id = "abc-123-unsafe/value";

    expect(createDiagnosticReportFileName(detail, "html")).toBe(
      "WhyIsMyPCSlow-2026-08-21-10-00-00-abc-123-.html",
    );
  });
});

function createDetail(): DiagnosticHistoryDetail {
  return {
    id: "report-test",
    analyzedAt: "2026-08-21T10:00:00.000Z",
    status: "issuesFound",
    primaryFindingTitle: "Memoria RAM permaneceu sob pressao",
    primaryFindingCategory: "memory",
    primaryFindingImpact: "high",
    primaryFindingConfidence: 94,
    sampleCount: 8,
    durationSeconds: 8,
    engineVersion: "test-engine",
    createdAt: "2026-08-21T10:01:00.000Z",
    summary: {
      status: "issuesFound",
      primaryFinding: {
        id: "memory_pressure",
        category: "memory",
        title: "Memoria RAM permaneceu sob pressao",
        explanation: "A memoria disponivel ficou baixa durante a analise.",
        impact: "high",
        confidence: 94,
        evidence: [
          {
            label: "Memoria disponivel",
            value: "420 MB",
            detail: "Menor valor observado.",
          },
        ],
        recommendations: [
          {
            title: "Feche apps pesados",
            detail: "Reduza a carga de memoria antes de abrir jogos ou editores.",
          },
        ],
        relatedProcesses: [
          {
            name: "Google Chrome",
            cpuPercent: 4,
            memoryBytes: 3 * 1024 ** 3,
            diskTotalBytesPerSecond: 12 * 1024 ** 2,
          },
        ],
      },
      secondaryFindings: [],
      positiveChecks: [
        {
          id: "cpu_ok",
          title: "CPU dentro do esperado",
          detail: "Nao houve saturacao sustentada de CPU.",
        },
      ],
      analyzedAt: "2026-08-21T10:00:00.000Z",
      sampleCount: 8,
      durationSeconds: 8,
      engineVersion: "test-engine",
      timeline: [
        {
          timestamp: 1_000,
          offsetSeconds: 0,
          cpuUsagePercent: 30,
          memoryUsedPercent: 72,
          memoryAvailableBytes: 2 * 1024 ** 3,
          diskActivePercent: 48,
          diskReadBytesPerSecond: 6 * 1024 ** 2,
          diskWriteBytesPerSecond: 2 * 1024 ** 2,
          diskTotalBytesPerSecond: 8 * 1024 ** 2,
          diskQueueLength: 1,
          systemDriveFreePercent: 35,
          systemDriveAvailableBytes: 80 * 1024 ** 3,
          topCpuProcessName: "Google Chrome",
          topCpuProcessPercent: 12,
          topMemoryProcessName: "Google Chrome",
          topMemoryProcessBytes: 3 * 1024 ** 3,
          topDiskProcessName: "Google Chrome",
          topDiskProcessBytesPerSecond: 8 * 1024 ** 2,
        },
        {
          timestamp: 2_000,
          offsetSeconds: 1,
          cpuUsagePercent: 34,
          memoryUsedPercent: 74,
          memoryAvailableBytes: 1.8 * 1024 ** 3,
          diskActivePercent: 62,
          diskReadBytesPerSecond: 8 * 1024 ** 2,
          diskWriteBytesPerSecond: 4 * 1024 ** 2,
          diskTotalBytesPerSecond: 12 * 1024 ** 2,
          diskQueueLength: 1.5,
          systemDriveFreePercent: 34,
          systemDriveAvailableBytes: 78 * 1024 ** 3,
          topCpuProcessName: "Google Chrome",
          topCpuProcessPercent: 18,
          topMemoryProcessName: "Google Chrome",
          topMemoryProcessBytes: 3.1 * 1024 ** 3,
          topDiskProcessName: "Google Chrome",
          topDiskProcessBytesPerSecond: 12 * 1024 ** 2,
        },
      ],
    },
  };
}
