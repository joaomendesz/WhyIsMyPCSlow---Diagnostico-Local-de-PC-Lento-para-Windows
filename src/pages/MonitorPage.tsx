import { Pause, Play } from "lucide-react";
import { ProcessTable } from "../components/ProcessTable";
import { StatusPill } from "../components/StatusPill";
import { useMetricsStore } from "../stores/metricsStore";
import { formatBytes, formatPercent } from "../utils/format";

export function MonitorPage() {
  const { metrics, isStreaming, startMonitoring, stopMonitoring } = useMetricsStore();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Monitor</h2>
          <p className="mt-1 text-sm text-ink/60">CPU, memoria e processos vindos do Electron.</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill isActive={isStreaming} />
          <button
            type="button"
            title={isStreaming ? "Pausar monitoramento" : "Iniciar monitoramento"}
            onClick={() => void (isStreaming ? stopMonitoring() : startMonitoring())}
            className="grid h-10 w-10 place-items-center rounded-md border border-line bg-panel text-ink shadow-soft transition hover:border-teal hover:text-teal"
          >
            {isStreaming ? <Pause aria-hidden size={18} /> : <Play aria-hidden size={18} />}
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-line bg-panel p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-normal text-ink/55">CPU atual</p>
          <p className="mt-3 text-3xl font-semibold">{formatPercent(metrics?.cpu.totalUsagePercent)}</p>
        </div>
        <div className="rounded-md border border-line bg-panel p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-normal text-ink/55">Memoria usada</p>
          <p className="mt-3 text-3xl font-semibold">{formatPercent(metrics?.memory.usedPercent)}</p>
        </div>
        <div className="rounded-md border border-line bg-panel p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-normal text-ink/55">Disponivel</p>
          <p className="mt-3 text-3xl font-semibold">{formatBytes(metrics?.memory.availableBytes)}</p>
        </div>
      </section>

      <ProcessTable processes={metrics?.processGroups ?? []} />
    </div>
  );
}
