import type { LucideIcon } from "lucide-react";
import { clampPercent, formatPercent } from "../utils/format";

interface MetricCardProps {
  title: string;
  value: number | null;
  detail: string;
  icon: LucideIcon;
  tone: "teal" | "amber" | "rose" | "mint";
}

const toneClasses = {
  teal: "bg-teal",
  amber: "bg-amber",
  rose: "bg-rose",
  mint: "bg-mint",
};

export function MetricCard({ title, value, detail, icon: Icon, tone }: MetricCardProps) {
  const percent = value === null ? 0 : clampPercent(value);

  return (
    <section className="rounded-md border border-line bg-panel p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-ink/55">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-ink">
            {value === null ? "--" : formatPercent(value)}
          </p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-canvas text-ink">
          <Icon aria-hidden size={20} />
        </div>
      </div>
      <div className="mt-5 metric-bar" aria-hidden>
        <span className={toneClasses[tone]} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 min-h-5 text-sm text-ink/65">{detail}</p>
    </section>
  );
}
