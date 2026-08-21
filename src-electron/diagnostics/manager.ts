import { setTimeout as sleep } from "node:timers/promises";
import type {
  DiagnosticProgress,
  DiagnosticSummary,
  MetricsSnapshot,
  StartDiagnosticRequest,
} from "../types";
import type { MetricsService } from "../services/metricsService";
import { runDiagnosticEngine } from "./engine";

const QUICK_DURATION_SECONDS = 8;
const COMPLETE_DURATION_SECONDS = 30;
const SAMPLE_INTERVAL_MS = 1_000;

interface ActiveDiagnostic {
  cancelRequested: boolean;
}

export class DiagnosticManager {
  private activeDiagnostic: ActiveDiagnostic | null = null;

  constructor(private readonly metricsService: MetricsService) {}

  async start(
    request: StartDiagnosticRequest,
    onProgress: (progress: DiagnosticProgress) => void,
  ): Promise<DiagnosticSummary> {
    if (this.activeDiagnostic) {
      throw new Error("Ja existe um diagnostico em andamento.");
    }

    const durationSeconds =
      request.mode === "complete" ? COMPLETE_DURATION_SECONDS : QUICK_DURATION_SECONDS;
    const activeDiagnostic: ActiveDiagnostic = { cancelRequested: false };
    this.activeDiagnostic = activeDiagnostic;

    const samples: MetricsSnapshot[] = [];

    try {
      onProgress(createProgress("preparing", 0, "Preparando diagnostico.", 0, durationSeconds, 0));

      for (let elapsedSeconds = 0; elapsedSeconds < durationSeconds; elapsedSeconds += 1) {
        if (activeDiagnostic.cancelRequested) {
          onProgress(
            createProgress(
              "cancelled",
              Math.round((elapsedSeconds / durationSeconds) * 100),
              "Diagnostico cancelado.",
              elapsedSeconds,
              durationSeconds,
              samples.length,
            ),
          );
          throw new Error("Diagnostico cancelado.");
        }

        samples.push(await this.metricsService.getLatestMetrics());
        onProgress(
          createProgress(
            "collecting",
            Math.round(((elapsedSeconds + 1) / durationSeconds) * 88),
            "Coletando CPU, memoria, processos e armazenamento.",
            elapsedSeconds + 1,
            durationSeconds,
            samples.length,
          ),
        );

        if (elapsedSeconds < durationSeconds - 1) {
          await sleep(SAMPLE_INTERVAL_MS);
        }
      }

      onProgress(
        createProgress(
          "analyzing",
          94,
          "Correlacionando amostras e evidencias.",
          durationSeconds,
          durationSeconds,
          samples.length,
        ),
      );

      const summary = runDiagnosticEngine(samples);

      onProgress(
        createProgress(
          "completed",
          100,
          "Diagnostico concluido.",
          durationSeconds,
          durationSeconds,
          samples.length,
        ),
      );

      return summary;
    } finally {
      if (this.activeDiagnostic === activeDiagnostic) {
        this.activeDiagnostic = null;
      }
    }
  }

  cancel(): DiagnosticProgress {
    if (!this.activeDiagnostic) {
      return createProgress("idle", 0, "Nenhum diagnostico em andamento.", 0, 0, 0);
    }

    this.activeDiagnostic.cancelRequested = true;
    return createProgress("cancelled", 0, "Cancelamento solicitado.", 0, 0, 0);
  }
}

function createProgress(
  status: DiagnosticProgress["status"],
  progressPercent: number,
  message: string,
  elapsedSeconds: number,
  durationSeconds: number,
  samplesCollected: number,
): DiagnosticProgress {
  return {
    status,
    progressPercent,
    message,
    elapsedSeconds,
    durationSeconds,
    samplesCollected,
  };
}
