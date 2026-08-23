import { Activity } from "lucide-react";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import type { DiagnosticTimelineSample } from "../types/diagnostics";
import { formatBytes, formatBytesPerSecond, formatPercent } from "../utils/format";

const EMPTY_TIMELINE: DiagnosticTimelineSample[] = [];

const chartColors = {
  cpu: "#d1495b",
  memory: "#0f8b8d",
  disk: "#f2a541",
  storage: "#2f9e44",
};

interface TimelinePoint extends DiagnosticTimelineSample {
  timeLabel: string;
}

export function DiagnosticTimelineChart({
  samples,
  framed = true,
}: {
  samples?: DiagnosticTimelineSample[] | null;
  framed?: boolean;
}) {
  const resolvedSamples = samples ?? EMPTY_TIMELINE;
  const data = useMemo<TimelinePoint[]>(
    () =>
      resolvedSamples.map((sample) => ({
        ...sample,
        timeLabel: formatSeconds(sample.offsetSeconds),
      })),
    [resolvedSamples],
  );

  if (data.length === 0) {
    return null;
  }

  const wrapperClass = framed
    ? "rounded-md border border-line bg-panel p-5 shadow-soft"
    : "border-t border-line pt-5";

  return (
    <section className={wrapperClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-canvas text-teal">
            <Activity aria-hidden size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold">Linha do tempo do diagnostico</h3>
            <p className="mt-1 text-sm text-ink/60">
              CPU, RAM, disco ativo e espaco livre durante a coleta.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-ink/60 sm:w-96">
          <TimelineStat label="CPU pico" value={formatPercent(maxOf(data, "cpuUsagePercent"))} />
          <TimelineStat label="RAM pico" value={formatPercent(maxOf(data, "memoryUsedPercent"))} />
          <TimelineStat label="Disco pico" value={formatPercent(maxNullableOf(data, "diskActivePercent"))} />
          <TimelineStat label="Amostras" value={String(data.length)} />
        </div>
      </div>

      <div
        className="mt-4 h-72 min-w-0"
        role="img"
        aria-label="Grafico de linha com CPU, RAM, disco ativo e espaco livre ao longo do diagnostico."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#d9dee7" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="offsetSeconds"
              tickFormatter={formatSeconds}
              tick={{ fill: "#202124", fontSize: 12 }}
              axisLine={{ stroke: "#d9dee7" }}
              tickLine={{ stroke: "#d9dee7" }}
              minTickGap={20}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: "#202124", fontSize: 12 }}
              axisLine={{ stroke: "#d9dee7" }}
              tickLine={{ stroke: "#d9dee7" }}
              width={42}
            />
            <Tooltip content={(props) => <TimelineTooltip {...props} />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Line
              type="monotone"
              dataKey="cpuUsagePercent"
              name="CPU"
              stroke={chartColors.cpu}
              strokeWidth={2}
              dot={data.length <= 12}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="memoryUsedPercent"
              name="RAM usada"
              stroke={chartColors.memory}
              strokeWidth={2}
              dot={data.length <= 12}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="diskActivePercent"
              name="Disco ativo"
              stroke={chartColors.disk}
              strokeWidth={2}
              dot={data.length <= 12}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="systemDriveFreePercent"
              name="Disco livre"
              stroke={chartColors.storage}
              strokeWidth={2}
              dot={data.length <= 12}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function TimelineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-canvas px-2 py-2 text-center">
      <p className="truncate text-[11px] text-ink/55">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function TimelineTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<TooltipValueType, string | number>) {
  const sample = payload?.[0]?.payload as TimelinePoint | undefined;

  if (!active || !sample) {
    return null;
  }

  return (
    <div className="w-64 rounded-md border border-line bg-panel px-3 py-2 text-xs text-ink shadow-soft">
      <p className="font-semibold">{formatSeconds(Number(label))}</p>
      <div className="mt-2 grid gap-1.5">
        <TooltipRow label="CPU" value={formatPercent(sample.cpuUsagePercent)} />
        <TooltipRow label="RAM usada" value={formatPercent(sample.memoryUsedPercent)} />
        <TooltipRow
          label="RAM livre"
          value={formatBytes(sample.memoryAvailableBytes)}
        />
        <TooltipRow
          label="Disco ativo"
          value={formatPercent(sample.diskActivePercent)}
        />
        <TooltipRow
          label="Leitura/escrita"
          value={`${formatBytesPerSecond(sample.diskReadBytesPerSecond)} / ${formatBytesPerSecond(
            sample.diskWriteBytesPerSecond,
          )}`}
        />
        <TooltipRow
          label="Fila"
          value={
            sample.diskQueueLength === null || sample.diskQueueLength === undefined
              ? "--"
              : sample.diskQueueLength.toFixed(sample.diskQueueLength >= 10 ? 0 : 1)
          }
        />
        <TooltipRow
          label="Disco livre"
          value={
            sample.systemDriveFreePercent === null
              ? "--"
              : `${formatPercent(sample.systemDriveFreePercent)} / ${formatBytes(
                  sample.systemDriveAvailableBytes,
                )}`
          }
        />
      </div>
      <div className="mt-3 border-t border-line pt-2 text-ink/60">
        <p className="truncate">
          CPU: {sample.topCpuProcessName ?? "--"}
          {sample.topCpuProcessPercent === null
            ? ""
            : ` (${formatPercent(sample.topCpuProcessPercent)})`}
        </p>
        <p className="mt-1 truncate">
          RAM: {sample.topMemoryProcessName ?? "--"}
          {sample.topMemoryProcessBytes === null
            ? ""
            : ` (${formatBytes(sample.topMemoryProcessBytes)})`}
        </p>
        <p className="mt-1 truncate">
          Disco: {sample.topDiskProcessName ?? "--"}
          {sample.topDiskProcessBytesPerSecond === null
            ? ""
            : ` (${formatBytesPerSecond(sample.topDiskProcessBytesPerSecond)})`}
        </p>
      </div>
    </div>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink/60">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function maxOf(data: TimelinePoint[], key: keyof Pick<TimelinePoint, "cpuUsagePercent" | "memoryUsedPercent">) {
  return data.reduce((maxValue, sample) => Math.max(maxValue, sample[key]), 0);
}

function maxNullableOf(
  data: TimelinePoint[],
  key: keyof Pick<TimelinePoint, "diskActivePercent">,
) {
  return data.reduce((maxValue, sample) => Math.max(maxValue, sample[key] ?? 0), 0);
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value)) {
    return "0s";
  }

  return `${Math.round(value)}s`;
}
