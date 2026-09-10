"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/vendedor/toast";
import { formatCOP } from "@/lib/money";
import { requestVoid } from "@/server/actions/shift";
import type { PaymentMethod } from "@/generated/prisma/enums";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

export type ShiftSale = {
  number: number;
  time: string;
  method: PaymentMethod;
  total: number;
  detail: string;
  voided: boolean;
  voidRequested: boolean;
};

export function SalesList({ sales }: { sales: ShiftSale[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function ask(sale: ShiftSale) {
    startTransition(async () => {
      const result = await requestVoid(sale.number, "Solicitada desde el POS");
      toast(
        result.ok
          ? `Solicitud enviada al administrador · venta #${sale.number}`
          : result.error,
      );
    });
  }

  return (
    <div className="flex flex-col gap-[7px]">
      {sales.map((sale) => (
        <div
          key={sale.number}
          className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[10px] shadow-[var(--shadow-sm)]"
          style={{ opacity: sale.voided ? 0.5 : 1 }}
        >
          <button
            type="button"
            onClick={() => setOpen(open === sale.number ? null : sale.number)}
            className="pos-tap w-full text-left"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-heading)] text-[13.5px]">
                #{sale.number}
              </span>
              <span className="text-[11px] text-[var(--color-neutral-400)]">
                {sale.time}
              </span>
              <span className="ml-auto rounded-[var(--radius-sm)] bg-[var(--color-neutral-900)] px-[7px] py-[2px] text-[10.5px] text-[var(--color-neutral-300)]">
                {METHOD_LABELS[sale.method]}
              </span>
              <span className="min-w-[66px] text-right font-[family-name:var(--font-heading)] text-[15px]">
                {formatCOP(sale.total)}
              </span>
            </div>
            <div className="mt-1 text-[11.5px] text-[var(--color-neutral-400)]">
              {sale.detail}
              {sale.voided ? " · ANULADA" : ""}
            </div>
          </button>

          {open === sale.number && !sale.voided ? (
            <div className="animate-rise-in mt-[9px] flex items-center gap-2 border-t border-[var(--color-divider)] pt-[9px]">
              <span className="flex-1 text-[11px] text-[var(--color-neutral-400)]">
                {sale.voidRequested
                  ? "Solicitud enviada · pendiente del administrador"
                  : "Cerrada · requiere autorización del administrador"}
              </span>
              <button
                type="button"
                disabled={pending || sale.voidRequested}
                onClick={() => ask(sale)}
                className="pos-tap rounded-[var(--radius-md)] border border-[var(--color-divider)] px-[10px] py-[6px] text-[11.5px] disabled:opacity-45"
              >
                Solicitar anulación
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
