import { Cpu, HardDrive, MemoryStick, RefreshCw } from "lucide-react";
import { MetricCard } from "../components/MetricCard";
import { ProcessTable } from "../components/ProcessTable";
import { StatusPill } from "../components/StatusPill";
import { useMetricsStore } from "../stores/metricsStore";
import { formatBytes, formatBytesPerSecond, formatUptime } from "../utils/format";

export function DashboardPage() {
  const { metrics, systemInfo, isLoading, isStreaming, error, refreshOnce } = useMetricsStore();

  const cpuValue = metrics?.cpu.totalUsagePercent ?? null;
  const memoryValue = metrics?.memory.usedPercent ?? null;
  const diskValue = metrics?.diskActivity.activePercent ?? null;
  const memoryDetail = metrics
    ? `${formatBytes(metrics.memory.usedBytes)} / ${formatBytes(metrics.memory.totalBytes)}`
    : "--";
  const diskDetail = metrics
    ? `${formatBytesPerSecond(metrics.diskActivity.readBytesPerSecond)} leitura / ${formatBytesPerSecond(metrics.diskActivity.writeBytesPerSecond)} escrita`
    : "--";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-normal text-ink">WhyIsMyPCSlow</h2>
          <p className="mt-1 text-sm text-ink/60">Descubra o que esta deixando seu PC lento.</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill isActive={isStreaming} />
          <button
            type="button"
            title="Atualizar metricas"
            onClick={() => void refreshOnce()}
            className="grid h-10 w-10 place-items-center rounded-md border border-line bg-panel text-ink shadow-soft transition hover:border-teal hover:text-teal"
          >
            <RefreshCw aria-hidden className={isLoading ? "animate-spin" : ""} size={18} />
          </button>
        </div>
      </header>

      {error ? (
        <section className="rounded-md border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-ink">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          title="CPU"
          value={cpuValue}
          detail={
            metrics
              ? `${metrics.cpu.logicalProcessors} logical processors`
              : "Coleta inicial em andamento"
          }
          icon={Cpu}
          tone="teal"
        />
        <MetricCard title="Memoria" value={memoryValue} detail={memoryDetail} icon={MemoryStick} tone="rose" />
        <MetricCard title="Disco ativo" value={diskValue} detail={diskDetail} icon={HardDrive} tone="amber" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <ProcessTable processes={metrics?.processGroups ?? []} isCompact />
        <section className="rounded-md border border-line bg-panel p-4 shadow-soft">
          <h2 className="text-sm font-semibold text-ink">Sistema</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">Windows</dt>
              <dd className="truncate text-right font-medium">
                {systemInfo?.osName ?? "Detectando"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">Versao</dt>
              <dd className="truncate text-right font-medium">
                {systemInfo?.osVersion ?? "--"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">Arquitetura</dt>
              <dd className="font-medium">{systemInfo?.architecture ?? "--"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">Uptime</dt>
              <dd className="font-medium">{formatUptime(systemInfo?.uptimeSeconds)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">RAM instalada</dt>
              <dd className="font-medium">{formatBytes(systemInfo?.totalMemoryBytes)}</dd>
            </div>
          </dl>
        </section>
      </section>
    </div>
  );
}
