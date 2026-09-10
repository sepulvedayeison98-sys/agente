"use client";

import Link from "next/link";
import { PlusCircle } from "@phosphor-icons/react";

export function SaleDoneActions() {
  return (
    <div className="mt-[14px]">
      <Link
        href="/pos"
        className="pos-tap flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-accent)] font-[family-name:var(--font-heading)] text-[16px] font-medium tracking-[0.03em] text-[var(--color-accent)]"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
        }}
      >
        <PlusCircle size={19} />
        NUEVA VENTA
      </Link>
      <Link
        href="/mis-ventas"
        className="pos-tap mt-[7px] grid h-[40px] w-full place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] text-[13px]"
      >
        Ver mis ventas
      </Link>
    </div>
  );
}
