import type { ProcessGroup } from "../types/metrics";
import { formatBytes, formatBytesPerSecond, formatPercent } from "../utils/format";

interface ProcessTableProps {
  processes: ProcessGroup[];
  isCompact?: boolean;
}

export function ProcessTable({ processes, isCompact = false }: ProcessTableProps) {
  const rows = isCompact ? processes.slice(0, 6) : processes;

  return (
    <section className="rounded-md border border-line bg-panel shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Processos</h2>
          <p className="text-xs text-ink/55">Agrupados por aplicativo quando possivel</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] table-fixed border-collapse text-left">
          <thead className="bg-canvas text-xs font-semibold uppercase tracking-normal text-ink/55">
            <tr>
              <th className="w-[36%] px-4 py-3">Aplicativo</th>
              <th className="w-[15%] px-4 py-3 text-right">CPU</th>
              <th className="w-[20%] px-4 py-3 text-right">Memoria</th>
              <th className="w-[19%] px-4 py-3 text-right">Disco</th>
              <th className="w-[10%] px-4 py-3 text-right">Inst.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {rows.map((process) => (
              <tr key={process.key} className="hover:bg-canvas/70">
                <td className="px-4 py-3">
                  <div className="truncate font-medium text-ink">{process.displayName}</div>
                  <div className="truncate text-xs text-ink/50">{process.key}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatPercent(process.totalCpuPercent)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBytes(process.totalMemoryBytes)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBytesPerSecond(process.totalDiskBytesPerSecond)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{process.processCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-sm text-ink/60">
          Aguardando metricas reais do backend Electron.
        </div>
      ) : null}
    </section>
  );
}
