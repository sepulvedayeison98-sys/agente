"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockSimple, Warning } from "@phosphor-icons/react";
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
  const [armed, setArmed] = useState(false);

  const countedNumber = Number(counted || 0);
  const difference = countedNumber - expectedCash;

  // El descuadre es el dato por el que existe esta pantalla. Antes se pintaba
  // igual que un cuadre perfecto y pasaba desapercibido.
  const verdict =
    difference === 0
      ? { color: "var(--color-success)", word: "La caja cuadra" }
      : difference > 0
        ? { color: "var(--color-warning)", word: "Sobra dinero" }
        : { color: "var(--color-danger)", word: "Falta dinero" };

  function submit() {
    if (!counted) {
      toast("Ingresa el efectivo contado.");
      return;
    }
    // Cerrar la caja no se deshace: se pide un segundo toque, sobre todo
    // cuando el conteo no cuadra.
    if (!armed) {
      setArmed(true);
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
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px]">Diferencia</span>
          <span className="text-right">
            <span
              className="block font-[family-name:var(--font-heading)] text-[22px] tabular-nums"
              style={{ color: verdict.color }}
            >
              {formatSignedCOP(difference)}
            </span>
            <span
              className="block text-[10.5px] font-medium uppercase tracking-[0.1em]"
              style={{ color: verdict.color }}
            >
              {verdict.word}
            </span>
          </span>
        </div>
      </div>

      <div className="mt-[10px]">
        <Keypad
          value={counted}
          onChange={(next) => {
            setArmed(false);
            setCounted(next);
          }}
          keyHeight={44}
        />
      </div>

      {armed ? (
        <p className="animate-rise-in mt-[14px] flex items-start gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[12.5px] leading-snug"
          style={{
            color: verdict.color,
            background: `color-mix(in srgb, ${verdict.color} 12%, transparent)`,
          }}
        >
          <Warning size={16} className="mt-px shrink-0" />
          <span>
            {difference === 0
              ? "Vas a cerrar el turno. Después no se puede deshacer."
              : `${verdict.word}: ${formatSignedCOP(difference)}. El cierre queda registrado así y no se puede deshacer.`}
          </span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="pos-tap mt-[14px] flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border font-[family-name:var(--font-heading)] text-[16px] font-medium tracking-[0.03em] disabled:opacity-45"
        style={{
          borderColor: armed ? verdict.color : "var(--color-accent)",
          color: armed ? verdict.color : "var(--color-accent)",
          background: `color-mix(in srgb, ${
            armed ? verdict.color : "var(--color-accent)"
          } 14%, transparent)`,
        }}
      >
        <LockSimple size={19} />
        {pending ? "CERRANDO…" : armed ? "SÍ, CERRAR EL TURNO" : "CONFIRMAR CIERRE"}
      </button>
    </div>
  );
}
