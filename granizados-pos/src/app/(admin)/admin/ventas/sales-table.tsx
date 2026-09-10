"use client";

import { useState, useTransition } from "react";
import { Warning } from "@phosphor-icons/react";
import { formatCOP } from "@/lib/money";
import { voidSale } from "@/server/actions/admin-sales";
import type { PaymentMethod } from "@/generated/prisma/enums";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

export type AdminSale = {
  number: number;
  seller: string;
  time: string;
  method: PaymentMethod;
  total: number;
  detail: string;
  voided: boolean;
  voidReason: string | null;
  requestedReason: string | null;
};

export function SalesTable({ sales }: { sales: AdminSale[] }) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(number: number) {
    setError(null);
    startTransition(async () => {
      const result = await voidSale(number, reason);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(null);
      setReason("");
    });
  }

  if (sales.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-[var(--color-neutral-400)]">
        Todavía no hay ventas registradas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sales.map((sale) => (
        <div
          key={sale.number}
          className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[10px] shadow-[var(--shadow-sm)]"
          style={{ opacity: sale.voided ? 0.5 : 1 }}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-heading)] text-[12.5px]">
              #{sale.number}
            </span>
            <span className="text-[11px] text-[var(--color-neutral-400)]">
              {sale.time}
            </span>
            <span className="text-[12px] text-[var(--color-neutral-400)]">
              {METHOD_LABELS[sale.method]}
            </span>
            <span className="ml-auto font-[family-name:var(--font-heading)] text-[13px]">
              {formatCOP(sale.total)}
            </span>
          </div>
          <div className="mt-[2px] text-[10.5px] text-[var(--color-neutral-400)]">
            {sale.seller} · {sale.detail}
          </div>

          {sale.voided ? (
            <div className="mt-[6px] text-[11px] text-[var(--color-neutral-400)]">
              ANULADA · {sale.voidReason}
            </div>
          ) : (
            <>
              {sale.requestedReason ? (
                <div className="mt-[6px] flex items-center gap-[6px] text-[11px] text-[var(--color-accent-300)]">
                  <Warning size={13} weight="fill" />
                  El vendedor solicitó anular esta venta
                </div>
              ) : null}

              {confirming === sale.number ? (
                <div className="animate-rise-in mt-[9px] border-t border-[var(--color-divider)] pt-[9px]">
                  <label className="text-[11px] text-[var(--color-neutral-400)]">
                    Motivo de la anulación
                  </label>
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Ej. cobro duplicado"
                    className="mt-[4px] h-[38px] w-full rounded-[var(--radius-md)] bg-[var(--color-bg)] px-[10px] text-[13px] outline-none"
                    style={{ boxShadow: "inset 0 0 0 1px var(--color-divider)" }}
                  />
                  {error ? (
                    <p className="mt-[6px] text-[11px] text-[var(--color-accent-300)]">
                      {error}
                    </p>
                  ) : null}
                  <div className="mt-[9px] flex gap-[7px]">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => submit(sale.number)}
                      className="pos-tap grid h-[36px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[12.5px] text-[var(--color-accent)] disabled:opacity-45"
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                      }}
                    >
                      {pending ? "Anulando…" : "Confirmar anulación"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(null);
                        setError(null);
                      }}
                      className="pos-tap grid h-[36px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-3 text-[12.5px]"
                    >
                      Cancelar
                    </button>
                  </div>
                  <p className="mt-[7px] text-[10.5px] text-[var(--color-neutral-400)]">
                    La venta no se borra: queda registrada como anulada y el
                    inventario descontado vuelve a existencias.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(sale.number);
                    setReason(sale.requestedReason ?? "");
                  }}
                  className="pos-tap mt-[7px] rounded-[var(--radius-md)] border border-[var(--color-divider)] px-[10px] py-[5px] text-[11.5px]"
                >
                  Anular
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
