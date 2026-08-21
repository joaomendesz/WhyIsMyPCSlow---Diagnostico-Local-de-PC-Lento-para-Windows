import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { HistoryRepository } from "./historyRepository";
import type { DiagnosticSummary } from "../types";

describe("HistoryRepository", () => {
  it("saves and lists diagnostic summaries", () => {
    const repository = new HistoryRepository(new DatabaseSync(":memory:"));
    const summary = createSummary();

    const id = repository.saveSummary(summary);
    const sessions = repository.listSessions();
    const detail = repository.getSession(id);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe(id);
    expect(sessions[0]?.primaryFindingTitle).toBe("Memoria RAM permaneceu sob pressao");
    expect(detail?.summary.primaryFinding?.id).toBe("memory_pressure");

    repository.close();
  });

  it("clears saved sessions", () => {
    const repository = new HistoryRepository(new DatabaseSync(":memory:"));

    repository.saveSummary(createSummary());
    expect(repository.clearSessions()).toBe(1);
    expect(repository.listSessions()).toHaveLength(0);

    repository.close();
  });
});

function createSummary(): DiagnosticSummary {
  return {
    status: "issuesFound",
    primaryFinding: {
      id: "memory_pressure",
      category: "memory",
      title: "Memoria RAM permaneceu sob pressao",
      explanation: "A memoria disponivel ficou baixa.",
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
          detail: "Reduza a carga de memoria.",
        },
      ],
      relatedProcesses: [
        {
          name: "Google Chrome",
          cpuPercent: 4,
          memoryBytes: 3 * 1024 ** 3,
        },
      ],
    },
    secondaryFindings: [],
    positiveChecks: [],
    analyzedAt: "2026-08-21T10:00:00.000Z",
    sampleCount: 8,
    durationSeconds: 8,
    engineVersion: "test-engine",
  };
}
