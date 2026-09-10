import { formatCOP } from "@/lib/money";

export function HourBars({
  bars,
}: {
  bars: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));

  return (
    <div className="flex h-[96px] items-end gap-[5px] rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[10px] shadow-[var(--shadow-sm)]">
      {bars.map((bar) => (
        <div
          key={bar.label}
          className="flex h-full flex-1 flex-col items-center justify-end gap-[5px]"
          title={`${bar.label}:00 · ${formatCOP(bar.value)}`}
        >
          <div
            className="w-full rounded-[3px]"
            style={{
              height: `${Math.max(3, Math.round((bar.value / max) * 62))}px`,
              background: bar.value
                ? "var(--color-accent)"
                : "var(--color-neutral-800)",
            }}
          />
          <span className="text-[9px] text-[var(--color-neutral-400)]">
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  );
}
