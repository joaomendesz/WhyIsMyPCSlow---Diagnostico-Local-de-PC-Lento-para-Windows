import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  DiagnosticFinding,
  DiagnosticHistoryDetail,
  DiagnosticHistoryItem,
  DiagnosticSummary,
} from "../types";

interface SessionRow {
  id: string;
  analyzed_at: string;
  status: DiagnosticHistoryItem["status"];
  primary_finding_title: string | null;
  primary_finding_category: DiagnosticHistoryItem["primaryFindingCategory"];
  primary_finding_impact: DiagnosticHistoryItem["primaryFindingImpact"];
  primary_finding_confidence: number | null;
  sample_count: number;
  duration_seconds: number;
  engine_version: string;
  summary_json: string;
  created_at: string;
}

export class HistoryRepository {
  constructor(private readonly database: DatabaseSync) {
    this.migrate();
  }

  saveSummary(summary: DiagnosticSummary): string {
    const id = randomUUID();
    const now = new Date().toISOString();
    const primaryFinding = summary.primaryFinding;
    const findings = primaryFinding
      ? [primaryFinding, ...summary.secondaryFindings]
      : summary.secondaryFindings;

    const insertSession = this.database.prepare(`
      INSERT INTO diagnostic_sessions (
        id,
        analyzed_at,
        status,
        primary_finding_title,
        primary_finding_category,
        primary_finding_impact,
        primary_finding_confidence,
        sample_count,
        duration_seconds,
        engine_version,
        summary_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertFinding = this.database.prepare(`
      INSERT INTO diagnostic_findings (
        session_id,
        finding_id,
        rank,
        category,
        title,
        impact,
        confidence,
        evidence_json,
        recommendations_json,
        related_processes_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.database.exec("BEGIN IMMEDIATE TRANSACTION");

    try {
      insertSession.run(
        id,
        summary.analyzedAt,
        summary.status,
        primaryFinding?.title ?? null,
        primaryFinding?.category ?? null,
        primaryFinding?.impact ?? null,
        primaryFinding?.confidence ?? null,
        summary.sampleCount,
        summary.durationSeconds,
        summary.engineVersion,
        JSON.stringify(summary),
        now,
      );

      findings.forEach((finding, index) => {
        insertFinding.run(
          id,
          finding.id,
          index,
          finding.category,
          finding.title,
          finding.impact,
          finding.confidence,
          JSON.stringify(finding.evidence),
          JSON.stringify(finding.recommendations),
          JSON.stringify(finding.relatedProcesses),
        );
      });

      this.database.exec("COMMIT");
      return id;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  listSessions(limit = 100): DiagnosticHistoryItem[] {
    const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));
    const rows = this.database
      .prepare(
        `
        SELECT
          id,
          analyzed_at,
          status,
          primary_finding_title,
          primary_finding_category,
          primary_finding_impact,
          primary_finding_confidence,
          sample_count,
          duration_seconds,
          engine_version,
          summary_json,
          created_at
        FROM diagnostic_sessions
        ORDER BY analyzed_at DESC, created_at DESC
        LIMIT ?
      `,
      )
      .all(safeLimit) as unknown as SessionRow[];

    return rows.map(toHistoryItem);
  }

  getSession(id: string): DiagnosticHistoryDetail | null {
    const row = this.database
      .prepare(
        `
        SELECT
          id,
          analyzed_at,
          status,
          primary_finding_title,
          primary_finding_category,
          primary_finding_impact,
          primary_finding_confidence,
          sample_count,
          duration_seconds,
          engine_version,
          summary_json,
          created_at
        FROM diagnostic_sessions
        WHERE id = ?
      `,
      )
      .get(id) as unknown as SessionRow | undefined;

    if (!row) {
      return null;
    }

    return {
      ...toHistoryItem(row),
      summary: JSON.parse(row.summary_json) as DiagnosticSummary,
    };
  }

  clearSessions(): number {
    this.database.exec("BEGIN IMMEDIATE TRANSACTION");

    try {
      const countRow = this.database
        .prepare("SELECT COUNT(*) AS count FROM diagnostic_sessions")
        .get() as unknown as { count: number };
      this.database.prepare("DELETE FROM diagnostic_findings").run();
      this.database.prepare("DELETE FROM diagnostic_sessions").run();
      this.database.exec("COMMIT");
      return countRow.count;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close() {
    this.database.close();
  }

  private migrate() {
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS diagnostic_sessions (
        id TEXT PRIMARY KEY,
        analyzed_at TEXT NOT NULL,
        status TEXT NOT NULL,
        primary_finding_title TEXT,
        primary_finding_category TEXT,
        primary_finding_impact TEXT,
        primary_finding_confidence INTEGER,
        sample_count INTEGER NOT NULL,
        duration_seconds INTEGER NOT NULL,
        engine_version TEXT NOT NULL,
        summary_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_analyzed_at
      ON diagnostic_sessions (analyzed_at DESC);

      CREATE TABLE IF NOT EXISTS diagnostic_findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        finding_id TEXT NOT NULL,
        rank INTEGER NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        impact TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        evidence_json TEXT NOT NULL,
        recommendations_json TEXT NOT NULL,
        related_processes_json TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES diagnostic_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_diagnostic_findings_session_id
      ON diagnostic_findings (session_id, rank);
    `);
  }
}

export function createHistoryRepository(userDataPath: string): HistoryRepository {
  const databaseDirectory = path.join(userDataPath, "data");
  mkdirSync(databaseDirectory, { recursive: true });

  return new HistoryRepository(
    new DatabaseSync(path.join(databaseDirectory, "whyismypcslow.sqlite")),
  );
}

function toHistoryItem(row: SessionRow): DiagnosticHistoryItem {
  return {
    id: row.id,
    analyzedAt: row.analyzed_at,
    status: row.status,
    primaryFindingTitle: row.primary_finding_title,
    primaryFindingCategory: row.primary_finding_category,
    primaryFindingImpact: row.primary_finding_impact,
    primaryFindingConfidence: row.primary_finding_confidence,
    sampleCount: row.sample_count,
    durationSeconds: row.duration_seconds,
    engineVersion: row.engine_version,
    createdAt: row.created_at,
  };
}

export function buildHistoryItemFromSummary(
  id: string,
  summary: DiagnosticSummary,
): DiagnosticHistoryItem {
  const primaryFinding: DiagnosticFinding | null = summary.primaryFinding;

  return {
    id,
    analyzedAt: summary.analyzedAt,
    status: summary.status,
    primaryFindingTitle: primaryFinding?.title ?? null,
    primaryFindingCategory: primaryFinding?.category ?? null,
    primaryFindingImpact: primaryFinding?.impact ?? null,
    primaryFindingConfidence: primaryFinding?.confidence ?? null,
    sampleCount: summary.sampleCount,
    durationSeconds: summary.durationSeconds,
    engineVersion: summary.engineVersion,
    createdAt: new Date().toISOString(),
  };
}
