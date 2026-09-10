import "server-only";
import { prisma } from "@/lib/prisma";
import { round } from "@/server/inventory";
import type { SessionPayload } from "@/lib/session-token";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type MovementKind = "ENTRADA" | "SALIDA" | "AJUSTE";

function requireAdmin(session: SessionPayload): string | null {
  return session.role === "ADMINISTRADOR"
    ? null
    : "Solo el administrador puede mover el inventario.";
}

export async function createInventoryItem(
  session: SessionPayload,
  input: { name: string; unit: string; quantity: number; minimum: number },
): Promise<ActionResult> {
  const denied = requireAdmin(session);
  if (denied) return { ok: false, error: denied };

  const name = input.name.trim();
  const unit = input.unit.trim();
  if (!name) return { ok: false, error: "Escribe el nombre del insumo." };
  if (!unit) return { ok: false, error: "Escribe la unidad (kg, unid, l...)." };
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    return { ok: false, error: "La existencia inicial no es válida." };
  }
  if (!Number.isFinite(input.minimum) || input.minimum < 0) {
    return { ok: false, error: "El mínimo no es válido." };
  }

  const quantity = round(input.quantity);

  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: { name, unit, quantity, minimum: round(input.minimum) },
    });

    // La existencia inicial también es un movimiento: así el histórico explica
    // de dónde salió cada unidad desde el primer día.
    if (quantity > 0) {
      await tx.inventoryMovement.create({
        data: {
          itemId: item.id,
          type: "ENTRADA",
          quantity,
          userId: session.userId,
          reason: "Existencia inicial",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "insumo_creado",
        entity: "InventoryItem",
        entityId: item.id,
        newValue: { nombre: name, unidad: unit, existencia: quantity, minimo: input.minimum },
      },
    });
  });

  return { ok: true };
}

/**
 * Entrada suma, salida resta y ajuste lleva la existencia al valor contado.
 * El movimiento guarda siempre el cambio real aplicado, de modo que
 * `existencia = inicial + suma de movimientos` se mantiene cierto.
 */
export async function moveInventory(
  session: SessionPayload,
  input: { itemId: string; kind: MovementKind; amount: number; reason: string },
): Promise<ActionResult> {
  const denied = requireAdmin(session);
  if (denied) return { ok: false, error: denied };

  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: "El motivo es obligatorio." };
  if (!Number.isFinite(input.amount)) {
    return { ok: false, error: "La cantidad no es válida." };
  }
  if (input.kind !== "AJUSTE" && input.amount <= 0) {
    return { ok: false, error: "La cantidad debe ser mayor que cero." };
  }
  if (input.kind === "AJUSTE" && input.amount < 0) {
    return { ok: false, error: "La existencia contada no puede ser negativa." };
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: input.itemId },
    select: { quantity: true, name: true },
  });
  if (!item) return { ok: false, error: "Ese insumo ya no existe." };

  const delta =
    input.kind === "ENTRADA"
      ? round(input.amount)
      : input.kind === "SALIDA"
        ? -round(input.amount)
        : round(input.amount - item.quantity);

  if (delta === 0) {
    return { ok: false, error: "La existencia contada es igual a la registrada." };
  }

  const next = round(item.quantity + delta);

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: input.itemId },
      data: { quantity: next },
    });

    await tx.inventoryMovement.create({
      data: {
        itemId: input.itemId,
        type: input.kind,
        // Entrada y salida guardan la magnitud (el tipo da el signo); el ajuste
        // guarda el cambio con signo, que es la única forma de reconstruirlo.
        quantity: input.kind === "AJUSTE" ? delta : round(input.amount),
        userId: session.userId,
        reason,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: input.kind === "AJUSTE" ? "ajuste_inventario" : "movimiento_inventario",
        entity: "InventoryItem",
        entityId: input.itemId,
        oldValue: { insumo: item.name, existencia: item.quantity },
        newValue: { existencia: next, tipo: input.kind, motivo: reason },
      },
    });
  });

  return { ok: true };
}

export async function updateInventoryItem(
  session: SessionPayload,
  input: { itemId: string; name: string; unit: string; minimum: number },
): Promise<ActionResult> {
  const denied = requireAdmin(session);
  if (denied) return { ok: false, error: denied };

  const name = input.name.trim();
  const unit = input.unit.trim();
  if (!name) return { ok: false, error: "Escribe el nombre del insumo." };
  if (!unit) return { ok: false, error: "Escribe la unidad." };
  if (!Number.isFinite(input.minimum) || input.minimum < 0) {
    return { ok: false, error: "El mínimo no es válido." };
  }

  const current = await prisma.inventoryItem.findUnique({
    where: { id: input.itemId },
    select: { name: true, unit: true, minimum: true },
  });
  if (!current) return { ok: false, error: "Ese insumo ya no existe." };

  // La existencia no se toca por aquí: para cambiarla está el ajuste, que deja
  // movimiento y motivo.
  await prisma.inventoryItem.update({
    where: { id: input.itemId },
    data: { name, unit, minimum: round(input.minimum) },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "insumo_editado",
      entity: "InventoryItem",
      entityId: input.itemId,
      oldValue: { nombre: current.name, unidad: current.unit, minimo: current.minimum },
      newValue: { nombre: name, unidad: unit, minimo: input.minimum },
    },
  });

  return { ok: true };
}
