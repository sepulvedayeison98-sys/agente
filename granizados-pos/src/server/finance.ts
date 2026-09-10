import "server-only";
import { prisma } from "@/lib/prisma";
import type { Range } from "@/server/periods";
import { emptyTotals, totalsByMethod, type MethodTotals } from "@/server/shift";

export type FinanceSummary = {
  revenue: number;
  byMethod: MethodTotals;
  productCost: number;
  expenses: number;
  profit: number;
};

/**
 * El costo de producto que el modelo conoce hoy es el de las adiciones
 * vendidas; los insumos de la receta no llevan costo unitario todavía.
 */
export async function financeSummary({ from, to }: Range): Promise<FinanceSummary> {
  const [sales, soldAddons, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { status: "OK", createdAt: { gte: from, lte: to } },
      select: { method: true, total: true, status: true },
    }),
    prisma.saleItemAddon.findMany({
      where: {
        saleItem: { sale: { status: "OK", createdAt: { gte: from, lte: to } } },
      },
      select: {
        addon: { select: { cost: true } },
        saleItem: { select: { quantity: true } },
      },
    }),
    prisma.expense.findMany({ where: { date: { gte: from, lte: to } } }),
  ]);

  const byMethod = sales.length ? totalsByMethod(sales) : emptyTotals();
  const revenue = sales.reduce((total, sale) => total + sale.total, 0);
  const productCost = soldAddons.reduce(
    (total, entry) => total + entry.addon.cost * entry.saleItem.quantity,
    0,
  );
  const expenseTotal = expenses.reduce((total, e) => total + e.value, 0);

  return {
    revenue,
    byMethod,
    productCost,
    expenses: expenseTotal,
    profit: revenue - productCost - expenseTotal,
  };
}

export type RankingRow = { label: string; value: number };

export async function rankings({ from, to }: Range) {
  const items = await prisma.saleItem.findMany({
    where: { sale: { status: "OK", createdAt: { gte: from, lte: to } } },
    select: {
      quantity: true,
      unitPrice: true,
      sizeName: true,
      flavorName: true,
      addons: { select: { addonName: true } },
      sale: { select: { method: true, user: { select: { name: true } } } },
    },
  });

  const flavors = new Map<string, number>();
  const sizes = new Map<string, number>();
  const addons = new Map<string, number>();
  const methods = new Map<string, number>();
  const sellers = new Map<string, number>();
  const hours = new Map<string, number>();

  const bump = (map: Map<string, number>, key: string, amount: number) => {
    map.set(key, (map.get(key) ?? 0) + amount);
  };

  for (const item of items) {
    bump(flavors, item.flavorName, item.quantity);
    bump(sizes, item.sizeName, item.quantity);
    for (const addon of item.addons) {
      bump(addons, addon.addonName, item.quantity);
    }
    bump(methods, METHOD_LABELS[item.sale.method], item.unitPrice * item.quantity);
    bump(sellers, item.sale.user.name, item.unitPrice * item.quantity);
  }

  const sales = await prisma.sale.findMany({
    where: { status: "OK", createdAt: { gte: from, lte: to } },
    select: { createdAt: true, total: true },
  });
  for (const sale of sales) {
    bump(hours, `${String(sale.createdAt.getHours()).padStart(2, "0")}:00`, sale.total);
  }

  return {
    flavors: top(flavors),
    sizes: top(sizes),
    addons: top(addons),
    methods: top(methods),
    sellers: top(sellers),
    hours: top(hours),
  };
}

const METHOD_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

export function top(map: Map<string, number>, limit = 5): RankingRow[] {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}
