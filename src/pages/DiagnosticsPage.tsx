import { AlertTriangle, CheckCircle2, Gauge, Play, Square, Stethoscope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  cancelDiagnostic,
  startCompleteDiagnostic,
  startQuickDiagnostic,
  subscribeDiagnosticFinished,
  subscribeDiagnosticProgress,
} from "../services/diagnostics";
import type {
  DiagnosticFinding,
  DiagnosticProgress,
  DiagnosticSummary,
} from "../types/diagnostics";
import { clampPercent, formatBytes, formatPercent } from "../utils/format";

const initialProgress: DiagnosticProgress = {
  status: "idle",
  progressPercent: 0,
  message: "Pronto para analisar.",
  elapsedSeconds: 0,
  durationSeconds: 0,
  samplesCollected: 0,
};

export function DiagnosticsPage() {
  const [progress, setProgress] = useState<DiagnosticProgress>(initialProgress);
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRunning =
    progress.status === "preparing" ||
    progress.status === "collecting" ||
    progress.status === "analyzing";
  const findings = useMemo(
    () =>
      summary?.primaryFinding
        ? [summary.primaryFinding, ...summary.secondaryFindings]
        : summary?.secondaryFindings ?? [],
    [summary],
  );

  useEffect(() => {
    let cleanupProgress: (() => void) | null = null;
    let cleanupFinished: (() => void) | null = null;
    let isMounted = true;

    void subscribeDiagnosticProgress((nextProgress) => {
      if (isMounted) {
        setProgress(nextProgress);
      }
    })
      .then((cleanup) => {
        cleanupProgress = cleanup;
      })
      .catch((subscriptionError) => {
        if (isMounted) {
          setError(getErrorMessage(subscriptionError));
        }
      });

    void subscribeDiagnosticFinished((nextSummary) => {
      if (isMounted) {
        setSummary(nextSummary);
      }
    })
      .then((cleanup) => {
        cleanupFinished = cleanup;
      })
      .catch((subscriptionError) => {
        if (isMounted) {
          setError(getErrorMessage(subscriptionError));
        }
      });

    return () => {
      isMounted = false;
      cleanupProgress?.();
      cleanupFinished?.();
    };
  }, []);

  async function runQuickDiagnostic() {
    setError(null);
    setSummary(null);

    try {
      setSummary(await startQuickDiagnostic());
    } catch (diagnosticError) {
      setError(getErrorMessage(diagnosticError));
    }
  }

  async function runCompleteDiagnostic() {
    setError(null);
    setSummary(null);

    try {
      setSummary(await startCompleteDiagnostic());
    } catch (diagnosticError) {
      setError(getErrorMessage(diagnosticError));
    }
  }

  async function stopDiagnostic() {
    setError(null);

    try {
      setProgress(await cancelDiagnostic());
    } catch (diagnosticError) {
      setError(getErrorMessage(diagnosticError));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Diagnostico</h2>
          <p className="mt-1 text-sm text-ink/60">Coleta, correlacao e explicacao local.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title="Iniciar diagnostico rapido"
            disabled={isRunning}
            onClick={() => void runQuickDiagnostic()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-teal disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play aria-hidden size={17} />
            Rapido
          </button>
          <button
            type="button"
            title="Iniciar diagnostico completo"
            disabled={isRunning}
            onClick={() => void runCompleteDiagnostic()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-panel px-4 text-sm font-semibold text-ink shadow-soft transition hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Gauge aria-hidden size={17} />
            Completo
          </button>
          <button
            type="button"
            title="Cancelar diagnostico"
            disabled={!isRunning}
            onClick={() => void stopDiagnostic()}
            className="grid h-10 w-10 place-items-center rounded-md border border-line bg-panel text-ink shadow-soft transition hover:border-rose hover:text-rose disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Square aria-hidden size={16} />
          </button>
        </div>
      </header>

      {error ? (
        <section className="rounded-md border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-ink">
          {error}
        </section>
      ) : null}

      <section className="rounded-md border border-line bg-panel p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-canvas text-teal">
              <Stethoscope aria-hidden size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Por que meu PC esta lento?</h3>
              <p className="mt-1 text-sm text-ink/60">{progress.message}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl font-semibold tabular-nums">
              {formatPercent(progress.progressPercent)}
            </p>
            <p className="text-xs text-ink/55">
              {progress.samplesCollected} amostras
              {progress.durationSeconds > 0
                ? ` em ${progress.elapsedSeconds}s/${progress.durationSeconds}s`
                : ""}
            </p>
          </div>
        </div>
        <div className="mt-5 metric-bar" aria-hidden>
          <span className="bg-teal" style={{ width: `${clampPercent(progress.progressPercent)}%` }} />
        </div>
      </section>

      {summary ? <SummaryPanel summary={summary} findings={findings} /> : null}
    </div>
  );
}

function SummaryPanel({
  summary,
  findings,
}: {
  summary: DiagnosticSummary;
  findings: DiagnosticFinding[];
}) {
  if (summary.status === "healthy") {
    return (
      <section className="rounded-md border border-line bg-panel p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <CheckCircle2 aria-hidden className="text-mint" size={24} />
          <div>
            <h3 className="text-lg font-semibold">Nenhum gargalo forte encontrado</h3>
            <p className="mt-1 text-sm text-ink/60">
              A analise nao encontrou evidencias suficientes para apontar CPU, RAM ou disco como
              causa principal.
            </p>
          </div>
        </div>
        <PositiveChecks summary={summary} />
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      {findings.map((finding, index) => (
        <FindingCard key={finding.id} finding={finding} isPrimary={index === 0} />
      ))}
      <PositiveChecks summary={summary} />
    </section>
  );
}

function FindingCard({
  finding,
  isPrimary,
}: {
  finding: DiagnosticFinding;
  isPrimary: boolean;
}) {
  return (
    <article className="rounded-md border border-line bg-panel p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isPrimary ? <AlertTriangle aria-hidden className="text-amber" size={21} /> : null}
            <h3 className="text-lg font-semibold">{finding.title}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink/68">{finding.explanation}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-56">
          <MetricBadge label="Impacto" value={impactLabel(finding.impact)} />
          <MetricBadge label="Confianca" value={formatPercent(finding.confidence)} />
        </div>
      </div>

      {finding.relatedProcesses.length > 0 ? (
        <div className="mt-4 rounded-md bg-canvas p-3 text-sm">
          <p className="font-semibold text-ink">Principal contribuinte</p>
          {finding.relatedProcesses.map((process) => (
            <div key={process.name} className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span>{process.name}</span>
              <span className="text-ink/60">
                {formatPercent(process.cpuPercent)} CPU / {formatBytes(process.memoryBytes)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold">Recomendacoes</h4>
          <div className="mt-3 grid gap-2">
            {finding.recommendations.map((recommendation) => (
              <div key={recommendation.title} className="rounded-md border border-line p-3">
                <p className="text-sm font-medium">{recommendation.title}</p>
                <p className="mt-1 text-sm leading-5 text-ink/60">{recommendation.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Evidencias</h4>
          <div className="mt-3 grid gap-2">
            {finding.evidence.map((item) => (
              <div key={item.label} className="rounded-md border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-sm font-semibold tabular-nums">{item.value}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-ink/55">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function PositiveChecks({ summary }: { summary: DiagnosticSummary }) {
  if (summary.positiveChecks.length === 0) {
    return null;
  }

  return (
    <section className="rounded-md border border-line bg-panel p-5 shadow-soft">
      <h3 className="text-sm font-semibold">Checks positivos</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {summary.positiveChecks.map((check) => (
          <div key={check.id} className="rounded-md border border-line p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden className="text-mint" size={17} />
              <p className="text-sm font-medium">{check.title}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink/55">{check.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-canvas px-3 py-2">
      <p className="text-xs text-ink/55">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function impactLabel(impact: DiagnosticFinding["impact"]): string {
  return {
    low: "Baixo",
    medium: "Medio",
    high: "Alto",
  }[impact];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
