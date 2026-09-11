"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { horaDelDia } from "@/lib/dia";
import {
  shiftSales,
  shiftStart,
  sumTotals,
  totalsByMethod,
} from "@/server/shift";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * El vendedor solo puede SOLICITAR la anulación (regla 12): queda registrada en
 * auditoría para que el administrador la ejecute o la descarte.
 */
export async function requestVoid(
  saleNumber: number,
  reason: string,
): Promise<ActionResult> {
  const session = await verifySession();

  const sale = await prisma.sale.findUnique({
    where: { number: saleNumber },
    select: { id: true, userId: true, status: true, total: true },
  });

  if (!sale) return { ok: false, error: "La venta no existe." };
  if (sale.userId !== session.userId) {
    return { ok: false, error: "Solo puedes solicitar la anulación de tus ventas." };
  }
  if (sale.status !== "OK") {
    return { ok: false, error: "Esa venta ya está anulada." };
  }

  const already = await prisma.auditLog.findFirst({
    where: { action: "solicitud_anulacion", entityId: sale.id },
  });
  if (already) {
    return { ok: false, error: "Ya hay una solicitud enviada para esta venta." };
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "solicitud_anulacion",
      entity: "Sale",
      entityId: sale.id,
      oldValue: { number: saleNumber, total: sale.total, status: sale.status },
      newValue: { motivo: reason.trim() || "Sin motivo indicado" },
    },
  });

  revalidatePath("/mis-ventas");
  return { ok: true };
}

export async function closeShift(counted: number): Promise<ActionResult> {
  const session = await verifySession();

  if (!Number.isFinite(counted) || counted < 0) {
    return { ok: false, error: "Ingresa el efectivo contado." };
  }

  const from = await shiftStart(session.userId);
  const sales = await shiftSales(session.userId, from);
  const totals = totalsByMethod(sales);

  await prisma.cashClosure.create({
    data: {
      shift: shiftLabel(new Date()),
      userId: session.userId,
      branchId: session.branchId,
      openedAt: from,
      closedAt: new Date(),
      expectedByMethod: totals,
      counted,
      difference: counted - totals.EFECTIVO,
      movements: {
        create: sales
          .filter((sale) => sale.status === "OK")
          .map((sale) => ({ saleId: sale.id, amount: sale.total })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "cierre_caja",
      entity: "CashClosure",
      entityId: session.userId,
      newValue: {
        esperadoEfectivo: totals.EFECTIVO,
        contado: counted,
        diferencia: counted - totals.EFECTIVO,
        totalTurno: sumTotals(totals),
      },
    },
  });

  revalidatePath("/cierre");
  revalidatePath("/mis-ventas");
  return { ok: true };
}

function shiftLabel(at: Date): string {
  const hour = horaDelDia(at);
  if (hour < 14) return "Turno mañana";
  if (hour < 20) return "Turno tarde";
  return "Turno noche";
}
