"use client";

import { useRouter } from "next/navigation";
import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import { formatSignedCOP } from "@/lib/money";

export function ClosedState({
  shift,
  time,
  difference,
}: {
  shift: string;
  time: string;
  difference: number;
}) {
  const router = useRouter();

  return (
    <div className="pt-[26px] text-center">
      <div
        className="mx-auto grid size-[68px] place-items-center rounded-full border border-[var(--color-accent)]"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
        }}
      >
        <LockSimple size={28} className="text-[var(--color-accent)]" />
      </div>

      <h1 className="mb-1 mt-[14px] font-[family-name:var(--font-heading)] text-[20px] font-medium">
        Caja cerrada
      </h1>
      <p className="text-[12px] text-[var(--color-neutral-400)]">
        {shift} · {time} · diferencia {formatSignedCOP(difference)}
      </p>
      <p className="mt-[14px] text-[11.5px] text-[var(--color-neutral-400)]">
        El administrador puede consultar este cierre en Caja.
      </p>

      <button
        type="button"
        onClick={() => router.push("/pos")}
        className="pos-tap mt-[18px] flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-accent)] font-[family-name:var(--font-heading)] text-[16px] font-medium tracking-[0.03em] text-[var(--color-accent)]"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
        }}
      >
        <LockSimpleOpen size={19} />
        ABRIR NUEVO TURNO
      </button>
    </div>
  );
}
