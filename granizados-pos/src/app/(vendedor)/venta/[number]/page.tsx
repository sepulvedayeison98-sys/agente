import { notFound } from "next/navigation";
import { Check, Package } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { formatCOP } from "@/lib/money";
import { SaleDoneActions } from "./actions";
import { formatHora } from "@/lib/dia";

const METHOD_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

export default async function VentaPage({
  params,
  searchParams,
}: PageProps<"/venta/[number]">) {
  const session = await verifySession();
  const { number } = await params;
  const query = await searchParams;

  const saleNumber = Number(number);
  if (!Number.isInteger(saleNumber)) notFound();

  const sale = await prisma.sale.findUnique({
    where: { number: saleNumber },
    select: {
      number: true,
      total: true,
      method: true,
      createdAt: true,
      userId: true,
    },
  });

  if (!sale || sale.userId !== session.userId) notFound();

  // El cambio no se guarda en la venta: viene del cobro que acaba de ocurrir.
  const changeParam = Array.isArray(query.cambio) ? query.cambio[0] : query.cambio;
  const change = Number(changeParam ?? 0);

  const time = formatHora(sale.createdAt);

  return (
    <div className="animate-rise-in pt-[30px] text-center">
      <div
        className="animate-pop-in mx-auto grid size-[76px] place-items-center rounded-full border border-[var(--color-accent)]"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
        }}
      >
        <Check size={34} className="text-[var(--color-accent)]" />
      </div>

      <h1 className="mb-1 mt-4 font-[family-name:var(--font-heading)] text-[20px] font-medium">
        Venta registrada correctamente
      </h1>
      <p className="text-[12px] text-[var(--color-neutral-400)]">
        Venta #{sale.number} · {time} · {METHOD_LABELS[sale.method] ?? sale.method}
      </p>

      <div className="mt-[18px] rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-left shadow-[var(--shadow-sm)]">
        <div className="flex justify-between text-[13px]">
          <span className="text-[var(--color-neutral-400)]">Total</span>
          <span className="font-[family-name:var(--font-heading)] text-[17px]">
            {formatCOP(sale.total)}
          </span>
        </div>
        {change > 0 ? (
          <div className="mt-[6px] flex justify-between text-[13px]">
            <span className="text-[var(--color-neutral-400)]">
              Cambio entregado
            </span>
            <span className="font-[family-name:var(--font-heading)] text-[17px]">
              {formatCOP(change)}
            </span>
          </div>
        ) : null}
        <div className="my-[10px] h-px bg-[var(--color-divider)]" />
        <div className="flex items-start gap-[7px] text-[11.5px] text-[var(--color-neutral-400)]">
          <Package size={14} className="mt-px text-[var(--color-accent)]" />
          <span>
            Inventario descontado automáticamente · vasos, hielo, pulpa y
            adiciones
          </span>
        </div>
      </div>

      <SaleDoneActions />
    </div>
  );
}
