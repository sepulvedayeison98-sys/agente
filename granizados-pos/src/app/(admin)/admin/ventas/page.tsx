import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { SalesTable, type AdminSale } from "./sales-table";

export default async function AdminVentasPage() {
  await requireAdmin();

  const sales = await prisma.sale.findMany({
    orderBy: { number: "desc" },
    take: 100,
    include: {
      user: { select: { name: true } },
      items: { select: { quantity: true, sizeName: true, flavorName: true } },
    },
  });

  const requests = await prisma.auditLog.findMany({
    where: {
      action: "solicitud_anulacion",
      entityId: { in: sales.map((sale) => sale.id) },
    },
    select: { entityId: true, newValue: true },
  });
  const requestedById = new Map(
    requests.map((entry) => [
      entry.entityId,
      (entry.newValue as { motivo?: string } | null)?.motivo ?? "Sin motivo",
    ]),
  );

  const rows: AdminSale[] = sales.map((sale) => ({
    number: sale.number,
    seller: sale.user.name,
    time: sale.createdAt.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    method: sale.method,
    total: sale.total,
    voided: sale.status !== "OK",
    voidReason: sale.voidReason,
    requestedReason: requestedById.get(sale.id) ?? null,
    detail: sale.items
      .map(
        (item) =>
          `${item.quantity}× ${item.sizeName.toLowerCase()} · ${item.flavorName}`,
      )
      .join(" · "),
  }));

  return <SalesTable sales={rows} />;
}
