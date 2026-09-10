"use client";

import { useRouter } from "next/navigation";
import {
  CurrencyCircleDollar,
  Minus,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import {
  decrement,
  findLine,
  increment,
  remove,
  useCart,
} from "@/components/vendedor/use-cart";
import {
  cartCount,
  cartTotal,
  lineSubtitle,
  lineSubtotal,
  lineTitle,
  lineUnitPrice,
} from "@/lib/cart";
import { formatCOP } from "@/lib/money";

export default function CarritoPage() {
  const router = useRouter();
  const { lines, hydrated } = useCart();

  const total = cartTotal(lines);
  const count = cartCount(lines);

  if (!hydrated) return null;

  return (
    <div>
      <h2 className="mb-[10px] text-[12px] font-medium text-[var(--color-neutral-400)]">
        Carrito · {count} ítems
      </h2>

      {lines.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[var(--color-neutral-400)]">
          El carrito está vacío.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {lines.map((line) => (
          <div
            key={line.id}
            className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[10px] shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-start gap-[10px]">
              <div className="min-w-0 flex-1">
                <div className="font-[family-name:var(--font-heading)] text-[14px] font-medium">
                  {lineTitle(line)}
                </div>
                <div className="text-[11px] text-[var(--color-neutral-400)]">
                  {lineSubtitle(line)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-[family-name:var(--font-heading)] text-[15px]">
                  {formatCOP(lineSubtotal(line))}
                </div>
                <div className="text-[10.5px] text-[var(--color-neutral-400)]">
                  {formatCOP(lineUnitPrice(line))} c/u
                </div>
              </div>
            </div>

            <div className="mt-[9px] flex items-center gap-2">
              <button
                type="button"
                onClick={() => decrement(line.id)}
                aria-label="Quitar una unidad"
                className="pos-tap grid size-[34px] place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)]"
              >
                <Minus size={15} />
              </button>
              <span className="min-w-[22px] text-center font-[family-name:var(--font-heading)] text-[15px]">
                {line.quantity}
              </span>
              <button
                type="button"
                onClick={() => increment(line.id)}
                aria-label="Agregar una unidad"
                className="pos-tap grid size-[34px] place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)]"
              >
                <Plus size={15} />
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => {
                  const target = findLine(line.id);
                  if (!target) return;
                  const params = new URLSearchParams({
                    tamano: target.sizeId,
                    sabor: target.flavorId,
                    adiciones: target.addons.map((a) => a.id).join(","),
                  });
                  remove(line.id);
                  router.push(`/pos?${params}`);
                }}
                className="pos-tap flex h-[34px] items-center gap-[5px] rounded-[var(--radius-md)] border border-[var(--color-divider)] px-[10px] text-[12px]"
              >
                <PencilSimple size={13} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => remove(line.id)}
                aria-label="Eliminar del carrito"
                className="pos-tap grid size-[34px] place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] text-[var(--color-neutral-400)]"
              >
                <Trash size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {lines.length > 0 ? (
        <>
          <div className="mt-[14px] rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)]">
            <div className="flex justify-between text-[13px] text-[var(--color-neutral-400)]">
              <span>Subtotal</span>
              <span>{formatCOP(total)}</span>
            </div>
            <div className="mt-[6px] flex items-baseline justify-between">
              <span className="font-[family-name:var(--font-heading)] text-[14px]">
                TOTAL
              </span>
              <span className="font-[family-name:var(--font-heading)] text-[26px]">
                {formatCOP(total)}
              </span>
            </div>
          </div>

          <div className="mt-[14px]">
            <button
              type="button"
              onClick={() => router.push("/cobro")}
              className="pos-tap flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-accent)] font-[family-name:var(--font-heading)] text-[16px] font-medium tracking-[0.03em] text-[var(--color-accent)]"
              style={{
                background:
                  "color-mix(in srgb, var(--color-accent) 14%, transparent)",
              }}
            >
              <CurrencyCircleDollar size={19} />
              COBRAR {formatCOP(total)}
            </button>
            <button
              type="button"
              onClick={() => router.push("/pos")}
              className="pos-tap mt-[7px] grid h-[40px] w-full place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] text-[13px]"
            >
              Seguir vendiendo
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
