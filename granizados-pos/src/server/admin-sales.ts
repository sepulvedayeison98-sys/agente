import "server-only";
import { prisma } from "@/lib/prisma";
import { round } from "@/server/inventory";
import type { SessionPayload } from "@/lib/session-token";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Anular NO borra la venta (regla 2): la marca como anulada, guarda motivo y
 * responsable, y devuelve al inventario lo que esa venta había descontado, para
 * que existencias y ventas sigan contando la misma historia.
 */
export async function executeVoid(
  session: SessionPayload,
  saleNumber: number,
  reason: string,
): Promise<ActionResult> {
  if (session.role !== "ADMINISTRADOR") {
    return { ok: false, error: "Solo el administrador puede anular una venta." };
  }

  const trimmed = reason.trim();
  if (!trimmed) {
    return { ok: false, error: "El motivo de la anulación es obligatorio." };
  }

  const sale = await prisma.sale.findUnique({
    where: { number: saleNumber },
    select: { id: true, status: true, total: true },
  });

  if (!sale) return { ok: false, error: "La venta no existe." };
  if (sale.status !== "OK") {
    return { ok: false, error: "Esa venta ya está anulada." };
  }

  const movements = await prisma.inventoryMovement.findMany({
    where: { saleId: sale.id, type: "VENTA" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: "ANULADA",
        voidReason: trimmed,
        voidedById: session.userId,
      },
    });

    for (const movement of movements) {
      const item = await tx.inventoryItem.findUnique({
        where: { id: movement.itemId },
        select: { quantity: true },
      });
      if (!item) continue;

      await tx.inventoryItem.update({
        where: { id: movement.itemId },
        data: { quantity: round(item.quantity + movement.quantity) },
      });
      await tx.inventoryMovement.create({
        data: {
          itemId: movement.itemId,
          type: "ENTRADA",
          quantity: movement.quantity,
          userId: session.userId,
          reason: `Anulación de venta #${saleNumber}`,
          saleId: sale.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "anular_venta",
        entity: "Sale",
        entityId: sale.id,
        oldValue: { number: saleNumber, status: "OK", total: sale.total },
        newValue: { status: "ANULADA", motivo: trimmed },
      },
    });
  });

  return { ok: true };
}
