import { verifySession } from "@/lib/dal";
import { formatCOP } from "@/lib/money";
import { shiftSales, shiftStart, totalsByMethod } from "@/server/shift";
import { prisma } from "@/lib/prisma";
import { SalesList, type ShiftSale } from "./sales-list";

export default async function MisVentasPage() {
  const session = await verifySession();

  const from = await shiftStart(session.userId);
  const sales = await shiftSales(session.userId, from);
  const totals = totalsByMethod(sales);

  const requested = await prisma.auditLog.findMany({
    where: {
      action: "solicitud_anulacion",
      entityId: { in: sales.map((sale) => sale.id) },
    },
    select: { entityId: true },
  });
  const requestedIds = new Set(requested.map((entry) => entry.entityId));

  const ok = sales.filter((sale) => sale.status === "OK");
  const sold = ok.reduce((total, sale) => total + sale.total, 0);

  const list: ShiftSale[] = sales.map((sale) => ({
    number: sale.number,
    time: sale.createdAt.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    method: sale.method,
    total: sale.total,
    voided: sale.status !== "OK",
    voidRequested: requestedIds.has(sale.id),
    detail: sale.items
      .map(
        (item) =>
          `${item.quantity}× Granizado ${item.sizeName.toLowerCase()} · ${item.flavorName}`,
      )
      .join(" · "),
  }));

  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-[6px]">
        {[
          { label: "Vendido", value: formatCOP(sold) },
          { label: "Ventas", value: String(ok.length) },
          { label: "Efectivo", value: formatCOP(totals.EFECTIVO) },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[10px] py-[9px] shadow-[var(--shadow-sm)]"
          >
            <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-neutral-400)]">
              {kpi.label}
            </div>
            <div className="mt-[2px] font-[family-name:var(--font-heading)] text-[16px]">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[var(--color-neutral-400)]">
          Todavía no has registrado ventas en este turno.
        </p>
      ) : (
        <SalesList sales={list} />
      )}
    </div>
  );
}
