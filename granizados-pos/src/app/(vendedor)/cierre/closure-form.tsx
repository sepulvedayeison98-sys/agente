"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockSimple } from "@phosphor-icons/react";
import { Keypad } from "@/components/ui/keypad";
import { useToast } from "@/components/vendedor/toast";
import { formatCOP, formatSignedCOP } from "@/lib/money";
import { closeShift } from "@/server/actions/shift";

type Row = { label: string; value: number; plain?: boolean };

export function ClosureForm({
  rows,
  expectedCash,
}: {
  rows: Row[];
  expectedCash: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [counted, setCounted] = useState("");
  const [pending, startTransition] = useTransition();

  const countedNumber = Number(counted || 0);
  const difference = countedNumber - expectedCash;

  function submit() {
    if (!counted) {
      toast("Ingresa el efectivo contado.");
      return;
    }
    startTransition(async () => {
      const result = await closeShift(countedNumber);
      if (!result.ok) {
        toast(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <h2 className="mb-[10px] text-[12px] font-medium text-[var(--color-neutral-400)]">
        Resumen del turno
      </h2>

      <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between py-[5px] text-[13px]"
          >
            <span className="text-[var(--color-neutral-400)]">{row.label}</span>
            <span className="font-[family-name:var(--font-heading)]">
              {row.plain ? row.value : formatCOP(row.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)]">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-[var(--color-neutral-400)]">
            Dinero esperado en efectivo
          </span>
          <span className="font-[family-name:var(--font-heading)] text-[19px]">
            {formatCOP(expectedCash)}
          </span>
        </div>
        <div className="my-[10px] h-px bg-[var(--color-divider)]" />
        <div className="flex items-baseline justify-between">
          <span className="text-[13px]">Efectivo contado</span>
          <span className="font-[family-name:var(--font-heading)] text-[19px]">
            {formatCOP(countedNumber)}
          </span>
        </div>
        <div className="my-[10px] h-px bg-[var(--color-divider)]" />
        <div className="flex items-baseline justify-between">
          <span className="text-[13px]">Diferencia</span>
          <span
            className="font-[family-name:var(--font-heading)] text-[22px]"
            style={{
              color:
                difference === 0
                  ? "var(--color-accent-300)"
                  : "var(--color-neutral-300)",
            }}
          >
            {formatSignedCOP(difference)}
          </span>
        </div>
      </div>

      <div className="mt-[10px]">
        <Keypad value={counted} onChange={setCounted} keyHeight={44} />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="pos-tap mt-[14px] flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-accent)] font-[family-name:var(--font-heading)] text-[16px] font-medium tracking-[0.03em] text-[var(--color-accent)] disabled:opacity-45"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
        }}
      >
        <LockSimple size={19} />
        {pending ? "CERRANDO…" : "CONFIRMAR CIERRE"}
      </button>
    </div>
  );
}
