import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { LowStockAlert } from "@/components/inventory/low-stock-alert";
import { getSetting } from "@/server/settings";
import { InventoryManager, type InventoryRow } from "./inventory-manager";
import { formatFechaHora } from "@/lib/dia";

export default async function AdminInventarioPage() {
  await requireAdmin();

  const items = await prisma.inventoryItem.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      movements: {
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { user: { select: { name: true } } },
      },
    },
  });

  const alertsOn = await getSetting("alertas_minimo");
  const low = alertsOn
    ? items.filter((item) => item.quantity <= item.minimum)
    : [];

  const rows: InventoryRow[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    minimum: item.minimum,
    movements: item.movements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      user: movement.user.name,
      date: formatFechaHora(movement.createdAt),
    })),
  }));

  return (
    <div className="flex flex-col gap-3">
      <LowStockAlert
        items={low.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        }))}
      />
      <InventoryManager rows={rows} />
    </div>
  );
}
