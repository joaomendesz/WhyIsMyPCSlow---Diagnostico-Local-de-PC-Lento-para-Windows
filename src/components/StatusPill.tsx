import { Circle } from "lucide-react";

interface StatusPillProps {
  isActive: boolean;
}

export function StatusPill({ isActive }: StatusPillProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-xs font-medium text-ink/70">
      <Circle
        aria-hidden
        className={isActive ? "fill-mint text-mint" : "fill-amber text-amber"}
        size={9}
      />
      {isActive ? "Monitorando" : "Parado"}
    </div>
  );
}
