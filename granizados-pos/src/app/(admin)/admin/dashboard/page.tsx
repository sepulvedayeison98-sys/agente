import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatCOP } from "@/lib/money";
import { isPeriodId, resolvePeriod, PERIODS } from "@/server/periods";
import { LowStockAlert } from "@/components/inventory/low-stock-alert";
import { getSetting } from "@/server/settings";
import { PeriodChips } from "./period-chips";
import { HourBars } from "./hour-bars";

export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin/dashboard">) {
  await requireAdmin();

  const query = await searchParams;
  const raw = Array.isArray(query.periodo) ? query.periodo[0] : query.periodo;
  const period = isPeriodId(raw) ? raw : "hoy";
  const { from, to } = resolvePeriod(period, {
    from: Array.isArray(query.desde) ? query.desde[0] : query.desde,
    to: Array.isArray(query.hasta) ? query.hasta[0] : query.hasta,
  });

  const [sales, expenses, items] = await Promise.all([
    prisma.sale.findMany({
      where: { status: "OK", createdAt: { gte: from, lte: to } },
      include: {
        items: {
          select: { quantity: true, addons: { select: { id: true } } },
        },
      },
    }),
    prisma.expense.findMany({ where: { date: { gte: from, lte: to } } }),
    prisma.inventoryItem.findMany(),
  ]);

  const revenue = sales.reduce((total, sale) => total + sale.total, 0);
  const units = sales.reduce(
    (total, sale) =>
      total + sale.items.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );
  const addonCount = sales.reduce(
    (total, sale) =>
      total +
      sale.items.reduce(
        (sum, item) => sum + item.addons.length * item.quantity,
        0,
      ),
    0,
  );
  const expenseTotal = expenses.reduce((total, e) => total + e.value, 0);
  const averageTicket = sales.length ? Math.round(revenue / sales.length) : 0;

  // El costo de producto sale de las adiciones vendidas, que es el único costo
  // que el modelo conoce hoy; recetas de insumo con costo llegan más adelante.
  const addonCost = await addonCostFor(from, to);
  const profit = revenue - addonCost - expenseTotal;

  const hours = Array.from({ length: 9 }, (_, index) => 10 + index);
  const byHour = new Map<number, number>();
  for (const sale of sales) {
    const hour = sale.createdAt.getHours();
    byHour.set(hour, (byHour.get(hour) ?? 0) + sale.total);
  }

  const alertsOn = await getSetting("alertas_minimo");
  const low = alertsOn
    ? items.filter((item) => item.quantity <= item.minimum)
    : [];

  const kpis = [
    { label: "Ventas", value: formatCOP(revenue), note: `${sales.length} ventas` },
    { label: "Ticket promedio", value: formatCOP(averageTicket), note: "por venta" },
    { label: "Productos vendidos", value: String(units), note: "granizados" },
    { label: "Adiciones", value: String(addonCount), note: formatCOP(addonCost) + " en costo" },
    { label: "Gastos", value: formatCOP(expenseTotal), note: `${expenses.length} registros` },
    { label: "Utilidad estimada", value: formatCOP(profit), note: "ventas − costo − gastos" },
  ];

  return (
    <div>
      <PeriodChips periods={PERIODS} active={period} />

      <div className="grid grid-cols-2 gap-[7px]">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[11px] shadow-[var(--shadow-sm)]"
          >
            <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--color-neutral-400)]">
              {kpi.label}
            </div>
            <div className="mt-[3px] font-[family-name:var(--font-heading)] text-[19px]">
              {kpi.value}
            </div>
            <div className="text-[10.5px] text-[var(--color-accent-300)]">
              {kpi.note}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-4 text-[12px] font-medium text-[var(--color-neutral-400)]">
        Ventas por hora
      </h2>
      <HourBars
        bars={hours.map((hour) => ({
          label: String(hour).padStart(2, "0"),
          value: byHour.get(hour) ?? 0,
        }))}
      />

      <div className="mt-3">
        <LowStockAlert
          items={low.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
          }))}
        />
      </div>
    </div>
  );
}

async function addonCostFor(from: Date, to: Date): Promise<number> {
  const soldAddons = await prisma.saleItemAddon.findMany({
    where: { saleItem: { sale: { status: "OK", createdAt: { gte: from, lte: to } } } },
    select: {
      addon: { select: { cost: true } },
      saleItem: { select: { quantity: true } },
    },
  });

  return soldAddons.reduce(
    (total, entry) => total + entry.addon.cost * entry.saleItem.quantity,
    0,
  );
}
