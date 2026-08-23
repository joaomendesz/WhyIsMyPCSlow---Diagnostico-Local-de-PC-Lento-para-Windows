import { CalendarClock, Database, RotateCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DiagnosticTimelineChart } from "../components/DiagnosticTimelineChart";
import {
  clearDiagnosticHistory,
  getDiagnosticHistoryDetail,
  listDiagnosticHistory,
} from "../services/history";
import type { DiagnosticHistoryDetail, DiagnosticHistoryItem } from "../types/diagnostics";
import { formatBytes, formatPercent } from "../utils/format";

export function HistoryPage() {
  const [items, setItems] = useState<DiagnosticHistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DiagnosticHistoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let isMounted = true;

    void getDiagnosticHistoryDetail(selectedId)
      .then((nextDetail) => {
        if (isMounted) {
          setDetail(nextDetail);
        }
      })
      .catch((historyError) => {
        if (isMounted) {
          setError(getErrorMessage(historyError));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  async function loadHistory() {
    setIsLoading(true);
    setError(null);

    try {
      const nextItems = await listDiagnosticHistory();
      setItems(nextItems);
      setSelectedId((currentId) => currentId ?? nextItems[0]?.id ?? null);
    } catch (historyError) {
      setError(getErrorMessage(historyError));
    } finally {
      setIsLoading(false);
    }
  }

  async function clearHistory() {
    setIsLoading(true);
    setError(null);

    try {
      await clearDiagnosticHistory();
      setItems([]);
      setSelectedId(null);
      setDetail(null);
    } catch (historyError) {
      setError(getErrorMessage(historyError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Historico</h2>
          <p className="mt-1 text-sm text-ink/60">
            Diagnosticos salvos localmente em SQLite.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Atualizar historico"
            onClick={() => void loadHistory()}
            className="grid h-10 w-10 place-items-center rounded-md border border-line bg-panel text-ink shadow-soft transition hover:border-teal hover:text-teal"
          >
            <RotateCw aria-hidden className={isLoading ? "animate-spin" : ""} size={17} />
          </button>
          <button
            type="button"
            title="Limpar historico"
            disabled={items.length === 0 || isLoading}
            onClick={() => void clearHistory()}
            className="grid h-10 w-10 place-items-center rounded-md border border-line bg-panel text-ink shadow-soft transition hover:border-rose hover:text-rose disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 aria-hidden size={17} />
          </button>
        </div>
      </header>

      {error ? (
        <section className="rounded-md border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-ink">
          {error}
        </section>
      ) : null}

      {items.length === 0 ? (
        <EmptyHistory />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <HistoryList items={items} selectedId={selectedId} onSelect={setSelectedId} />
          <HistoryDetailPanel item={selectedItem} detail={detail} />
        </section>
      )}
    </div>
  );
}

function EmptyHistory() {
  return (
    <section className="rounded-md border border-line bg-panel p-6 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-canvas text-amber">
          <Database aria-hidden size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Sem diagnosticos salvos ainda</h3>
          <p className="mt-1 text-sm text-ink/60">
            Execute um diagnostico rapido ou completo para criar o primeiro registro local.
          </p>
        </div>
      </div>
    </section>
  );
}

function HistoryList({
  items,
  selectedId,
  onSelect,
}: {
  items: DiagnosticHistoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-md border border-line bg-panel shadow-soft">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold">Sessoes</h3>
        <p className="text-xs text-ink/55">{items.length} diagnosticos locais</p>
      </div>
      <div className="max-h-[650px] overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={[
              "block w-full border-b border-line px-4 py-3 text-left transition last:border-b-0",
              selectedId === item.id ? "bg-canvas" : "bg-panel hover:bg-canvas/70",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {item.primaryFindingTitle ?? statusLabel(item.status)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-ink/55">
                  <CalendarClock aria-hidden size={13} />
                  {formatDateTime(item.analyzedAt)}
                </p>
              </div>
              <span className="shrink-0 rounded-md border border-line bg-panel px-2 py-1 text-xs font-medium">
                {item.primaryFindingImpact
                  ? impactLabel(item.primaryFindingImpact)
                  : statusLabel(item.status)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-ink/60">
              <span>{item.sampleCount} amostras</span>
              <span>{item.durationSeconds}s</span>
              <span>
                {item.primaryFindingConfidence !== null
                  ? formatPercent(item.primaryFindingConfidence)
                  : "--"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function HistoryDetailPanel({
  item,
  detail,
}: {
  item: DiagnosticHistoryItem | null;
  detail: DiagnosticHistoryDetail | null;
}) {
  if (!item) {
    return null;
  }

  const summary = detail?.summary;
  const finding = summary?.primaryFinding ?? null;

  return (
    <section className="rounded-md border border-line bg-panel p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {finding?.title ?? item.primaryFindingTitle ?? statusLabel(item.status)}
          </h3>
          <p className="mt-1 text-sm text-ink/60">{formatDateTime(item.analyzedAt)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-60">
          <SmallMetric label="Status" value={statusLabel(item.status)} />
          <SmallMetric
            label="Confianca"
            value={
              item.primaryFindingConfidence !== null
                ? formatPercent(item.primaryFindingConfidence)
                : "--"
            }
          />
        </div>
      </div>

      {finding ? (
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-ink/68">{finding.explanation}</p>

          {finding.relatedProcesses.length > 0 ? (
            <div className="rounded-md bg-canvas p-3 text-sm">
              <p className="font-semibold text-ink">Principal contribuinte</p>
              {finding.relatedProcesses.map((process) => (
                <div key={process.name} className="mt-2 flex flex-wrap justify-between gap-2">
                  <span>{process.name}</span>
                  <span className="text-ink/60">
                    {formatPercent(process.cpuPercent)} CPU / {formatBytes(process.memoryBytes)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Evidencias</h4>
              <div className="mt-3 grid gap-2">
                {finding.evidence.map((evidence) => (
                  <div key={evidence.label} className="rounded-md border border-line p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{evidence.label}</p>
                      <p className="text-sm font-semibold">{evidence.value}</p>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-ink/55">{evidence.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Recomendacoes</h4>
              <div className="mt-3 grid gap-2">
                {finding.recommendations.map((recommendation) => (
                  <div key={recommendation.title} className="rounded-md border border-line p-3">
                    <p className="text-sm font-medium">{recommendation.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ink/55">
                      {recommendation.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-ink/60">
          Esta sessao nao registrou um gargalo principal.
        </p>
      )}

      <DiagnosticTimelineChart samples={summary?.timeline} framed={false} />
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-canvas px-3 py-2">
      <p className="text-xs text-ink/55">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function statusLabel(status: DiagnosticHistoryItem["status"]): string {
  return {
    healthy: "Saudavel",
    issuesFound: "Problemas",
    inconclusive: "Inconclusivo",
  }[status];
}

function impactLabel(impact: NonNullable<DiagnosticHistoryItem["primaryFindingImpact"]>): string {
  return {
    low: "Baixo",
    medium: "Medio",
    high: "Alto",
  }[impact];
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
