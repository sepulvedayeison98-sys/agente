"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  CreditCard,
  DeviceMobile,
  DotsThreeCircle,
  Money,
} from "@phosphor-icons/react";
import { clear, useCart } from "@/components/vendedor/use-cart";
import { useToast } from "@/components/vendedor/toast";
import { Keypad } from "@/components/ui/keypad";
import { cartTotal } from "@/lib/cart";
import { formatCOP } from "@/lib/money";
import { confirmSale } from "@/server/actions/sales";
import type { PaymentMethod } from "@/generated/prisma/enums";

const METHODS: { id: PaymentMethod; label: string; Icon: typeof Money }[] = [
  { id: "EFECTIVO", label: "Efectivo", Icon: Money },
  { id: "TRANSFERENCIA", label: "Transferencia", Icon: DeviceMobile },
  { id: "TARJETA", label: "Tarjeta", Icon: CreditCard },
  { id: "OTRO", label: "Otro", Icon: DotsThreeCircle },
];

export default function CobroPage() {
  const router = useRouter();
  const { lines, hydrated } = useCart();
  const toast = useToast();

  const [method, setMethod] = useState<PaymentMethod>("EFECTIVO");
  const [received, setReceived] = useState("");
  const [busy, setBusy] = useState(false);

  // Una clave por intento de cobro: si el vendedor toca dos veces, el servidor
  // reconoce la misma venta en lugar de crear otra.
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    if (hydrated && lines.length === 0 && !busy) {
      router.replace("/pos");
    }
  }, [hydrated, lines.length, busy, router]);

  const total = cartTotal(lines);
  const receivedNumber = Number(received || 0);
  const change = receivedNumber - total;
  const isCash = method === "EFECTIVO";
  const blocked = busy || (isCash && receivedNumber < total);

  async function submit() {
    if (busy) return;
    if (isCash && receivedNumber < total) {
      toast("El dinero recibido es menor al total.");
      return;
    }
    setBusy(true);

    try {
      const result = await confirmSale({
        idempotencyKey: idempotencyKey.current,
        method,
        received: isCash ? receivedNumber : null,
        lines: lines.map((line) => ({
          sizeId: line.sizeId,
          flavorId: line.flavorId,
          addonIds: line.addons.map((a) => a.id),
          quantity: line.quantity,
        })),
      });

      if (!result.ok) {
        toast(result.error);
        setBusy(false);
        return;
      }

      clear();
      const params = new URLSearchParams({
        total: String(result.total),
        cambio: String(result.change),
        metodo: method,
      });
      router.replace(`/venta/${result.number}?${params}`);
    } catch {
      toast("No se pudo registrar la venta. Intenta de nuevo.");
      setBusy(false);
    }
  }

  if (!hydrated || lines.length === 0) return null;

  const ring = (on: boolean) =>
    on
      ? "inset 0 0 0 1px var(--color-accent)"
      : "inset 0 0 0 1px var(--color-divider)";

  return (
    <div>
      <div className="px-0 pb-3 pt-1 text-center">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-neutral-400)]">
          Total a cobrar
        </div>
        <div className="font-[family-name:var(--font-heading)] text-[38px] leading-[1.1]">
          {formatCOP(total)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[6px]">
        {METHODS.map(({ id, label, Icon }) => {
          const on = id === method;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              className="pos-tap flex h-[46px] items-center justify-center gap-[7px] rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[13.5px]"
              style={{
                boxShadow: ring(on),
                color: on ? "var(--color-accent)" : "var(--color-text)",
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {isCash ? (
        <div className="mt-[14px]">
          <div className="flex gap-[6px]">
            {[
              { label: "Exacto", value: total },
              { label: "$10.000", value: 10000 },
              { label: "$20.000", value: 20000 },
              { label: "$50.000", value: 50000 },
            ].map((quick) => (
              <button
                key={quick.label}
                type="button"
                onClick={() => setReceived(String(quick.value))}
                className="pos-tap grid h-[38px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] text-[12.5px]"
              >
                {quick.label}
              </button>
            ))}
          </div>

          <div className="mt-[10px] rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[11px] shadow-[var(--shadow-sm)]">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-[var(--color-neutral-400)]">
                Dinero recibido
              </span>
              <span className="font-[family-name:var(--font-heading)] text-[22px]">
                {formatCOP(receivedNumber)}
              </span>
            </div>
            <div className="my-[9px] h-px bg-[var(--color-divider)]" />
            <div className="flex items-baseline justify-between">
              <span className="text-[13px]">Cambio</span>
              <span
                className="font-[family-name:var(--font-heading)] text-[22px]"
                style={{
                  color:
                    change < 0
                      ? "var(--color-neutral-400)"
                      : "var(--color-accent-300)",
                }}
              >
                {formatCOP(Math.max(0, change))}
              </span>
            </div>
          </div>

          <div className="mt-[10px]">
            <Keypad value={received} onChange={setReceived} />
          </div>
        </div>
      ) : null}

      <div className="mt-[14px]">
        <button
          type="button"
          onClick={submit}
          disabled={blocked}
          className="pos-tap flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-accent)] font-[family-name:var(--font-heading)] text-[16px] font-medium tracking-[0.03em] text-[var(--color-accent)] disabled:opacity-45"
          style={{
            background:
              "color-mix(in srgb, var(--color-accent) 14%, transparent)",
          }}
        >
          <CheckCircle size={19} />
          {busy ? "REGISTRANDO…" : "CONFIRMAR VENTA"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/carrito")}
          className="pos-tap mt-[7px] grid h-[40px] w-full place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] text-[13px]"
        >
          Volver al carrito
        </button>
      </div>
    </div>
  );
}
