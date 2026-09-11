import "server-only";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { inicioDelDia } from "@/lib/dia";

export type MethodTotals = Record<PaymentMethod, number>;

export function emptyTotals(): MethodTotals {
  return { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, OTRO: 0 };
}

/**
 * El turno abierto de un vendedor va desde su último cierre de caja hasta ahora.
 * Si nunca ha cerrado, cuenta desde el comienzo del día.
 */
export async function shiftStart(userId: string): Promise<Date> {
  const lastClosure = await prisma.cashClosure.findFirst({
    where: { userId },
    orderBy: { closedAt: "desc" },
    select: { closedAt: true },
  });
  if (lastClosure) return lastClosure.closedAt;

  return inicioDelDia();
}

export async function shiftSales(userId: string, from: Date) {
  return prisma.sale.findMany({
    where: { userId, createdAt: { gte: from } },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { addons: true },
      },
    },
  });
}

type Countable = { method: PaymentMethod; total: number; status: string };

/**
 * Lo esperado por método sale de las ventas reales del turno. Las anuladas no
 * suman: el dinero no entró (o se devolvió).
 */
export function totalsByMethod(sales: Countable[]): MethodTotals {
  const totals = emptyTotals();
  for (const sale of sales) {
    if (sale.status !== "OK") continue;
    totals[sale.method] += sale.total;
  }
  return totals;
}

export function sumTotals(totals: MethodTotals): number {
  return Object.values(totals).reduce((sum, value) => sum + value, 0);
}

export function closureDifference(counted: number, expectedCash: number): number {
  return counted - expectedCash;
}
