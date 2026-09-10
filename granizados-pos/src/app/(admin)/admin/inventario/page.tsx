import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { LowStockAlert } from "@/components/inventory/low-stock-alert";
import { formatQuantity } from "@/lib/money";
import { getSetting } from "@/server/settings";

export default async function AdminInventarioPage() {
  await requireAdmin();

  const items = await prisma.inventoryItem.findMany({
    orderBy: { name: "asc" },
  });

  const alertsOn = await getSetting("alertas_minimo");
  const low = alertsOn
    ? items.filter((item) => item.quantity <= item.minimum)
    : [];

  return (
    <div className="flex flex-col gap-3">
      <LowStockAlert
        items={low.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        }))}
      />

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--color-divider)] text-[11px] uppercase tracking-[0.06em] text-[var(--color-neutral-400)]">
            <th className="py-2 font-normal">Insumo</th>
            <th className="py-2 text-right font-normal">Existencia</th>
            <th className="py-2 text-right font-normal">Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isLow = item.quantity <= item.minimum;
            return (
              <tr
                key={item.id}
                className="border-b border-[var(--color-divider)]"
              >
                <td className="py-[9px] text-[13px]">
                  {item.name}
                  {isLow ? (
                    <span className="text-[11px] text-[var(--color-accent-300)]">
                      {"  "}⚠ bajo
                    </span>
                  ) : null}
                </td>
                <td className="py-[9px] text-right font-[family-name:var(--font-heading)] text-[13px]">
                  {formatQuantity(item.quantity)} {item.unit}
                </td>
                <td className="py-[9px] text-right text-[12.5px] text-[var(--color-neutral-400)]">
                  {formatQuantity(item.minimum)} {item.unit}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="text-[11.5px] text-[var(--color-neutral-400)]">
        Cada venta descuenta vaso, hielo, pulpa y adiciones según la receta
        configurada.
      </p>
    </div>
  );
}
