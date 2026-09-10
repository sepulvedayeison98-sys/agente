"use client";

import Link from "next/link";
import type { PeriodId } from "@/server/periods";

export function PeriodChips({
  periods,
  active,
}: {
  periods: { id: PeriodId; label: string }[];
  active: PeriodId;
}) {
  return (
    <div className="pos-scroll mb-[10px] flex gap-[6px] overflow-x-auto">
      {periods.map((period) => {
        const on = period.id === active;
        return (
          <Link
            key={period.id}
            href={`/admin/dashboard?periodo=${period.id}`}
            className="pos-tap flex-none whitespace-nowrap rounded-[var(--radius-md)] px-[10px] py-[6px] text-[12px]"
            style={{
              boxShadow: on
                ? "inset 0 0 0 1px var(--color-accent)"
                : "inset 0 0 0 1px var(--color-divider)",
              color: on ? "var(--color-accent)" : "var(--color-text)",
            }}
          >
            {period.label}
          </Link>
        );
      })}
    </div>
  );
}
