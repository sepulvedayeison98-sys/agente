import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./reset";
import {
  createInventoryItem,
  moveInventory,
  removeInventoryItem,
  updateInventoryItem,
} from "@/server/inventory-admin";
import type { SessionPayload } from "@/lib/session-token";

const ADMIN: SessionPayload = {
  userId: "u_admin",
  role: "ADMINISTRADOR",
  branchId: "b1",
  name: "Camilo",
};
const VENDEDOR: SessionPayload = {
  userId: "u_sara",
  role: "VENDEDOR",
  branchId: "b1",
  name: "Sara",
};

async function seed() {
  await resetDatabase();
  await prisma.branch.create({ data: { id: "b1", name: "Sucursal" } });
  await prisma.user.createMany({
    data: [
      { id: "u_admin", name: "Camilo", username: "camilo", pinHash: "x", role: "ADMINISTRADOR", branchId: "b1" },
      { id: "u_sara", name: "Sara", username: "sara", pinHash: "x", role: "VENDEDOR", branchId: "b1" },
    ],
  });
}

async function makeItem(quantity = 10) {
  await createInventoryItem(ADMIN, {
    name: "Hielo",
    unit: "kg",
    quantity,
    minimum: 5,
  });
  const item = await prisma.inventoryItem.findFirst({ where: { name: "Hielo" } });
  return item!;
}

const stock = async (id: string) =>
  (await prisma.inventoryItem.findUnique({ where: { id } }))!.quantity;

beforeEach(seed);

describe("crear insumo", () => {
  it("lo guarda con su unidad, existencia y mínimo", async () => {
    const result = await createInventoryItem(ADMIN, {
      name: "Pulpa de coco",
      unit: "kg",
      quantity: 7.5,
      minimum: 2,
    });

    expect(result.ok).toBe(true);
    const item = await prisma.inventoryItem.findFirst({ where: { name: "Pulpa de coco" } });
    expect(item).toMatchObject({ unit: "kg", quantity: 7.5, minimum: 2 });
  });

  it("la existencia inicial queda como movimiento, no aparece de la nada", async () => {
    const item = await makeItem(10);

    const movements = await prisma.inventoryMovement.findMany({ where: { itemId: item.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      type: "ENTRADA",
      quantity: 10,
      reason: "Existencia inicial",
      userId: ADMIN.userId,
    });
  });

  it("arrancar en cero no inventa un movimiento", async () => {
    const item = await makeItem(0);
    expect(await prisma.inventoryMovement.count({ where: { itemId: item.id } })).toBe(0);
  });

  it("exige nombre y unidad", async () => {
    expect((await createInventoryItem(ADMIN, { name: "  ", unit: "kg", quantity: 1, minimum: 0 })).ok).toBe(false);
    expect((await createInventoryItem(ADMIN, { name: "X", unit: " ", quantity: 1, minimum: 0 })).ok).toBe(false);
  });

  it("rechaza existencia negativa", async () => {
    const result = await createInventoryItem(ADMIN, { name: "X", unit: "kg", quantity: -1, minimum: 0 });
    expect(result.ok).toBe(false);
  });

  it("el vendedor no puede crear insumos", async () => {
    const result = await createInventoryItem(VENDEDOR, { name: "X", unit: "kg", quantity: 1, minimum: 0 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("administrador");
    expect(await prisma.inventoryItem.count()).toBe(0);
  });
});

describe("movimientos de inventario", () => {
  it("entrada suma", async () => {
    const item = await makeItem(10);

    const result = await moveInventory(ADMIN, {
      itemId: item.id,
      kind: "ENTRADA",
      amount: 4.5,
      reason: "Compra de 2 bultos",
    });

    expect(result.ok).toBe(true);
    expect(await stock(item.id)).toBe(14.5);
  });

  it("salida resta", async () => {
    const item = await makeItem(10);

    await moveInventory(ADMIN, {
      itemId: item.id,
      kind: "SALIDA",
      amount: 3,
      reason: "Se derritió",
    });

    expect(await stock(item.id)).toBe(7);
  });

  it("el ajuste lleva la existencia al valor contado", async () => {
    const item = await makeItem(10);

    await moveInventory(ADMIN, {
      itemId: item.id,
      kind: "AJUSTE",
      amount: 8.5,
      reason: "Recuento físico",
    });

    expect(await stock(item.id)).toBe(8.5);
  });

  it("el ajuste guarda el cambio con signo, no el valor contado", async () => {
    const item = await makeItem(10);

    await moveInventory(ADMIN, { itemId: item.id, kind: "AJUSTE", amount: 8.5, reason: "Faltaba" });
    const bajada = await prisma.inventoryMovement.findFirst({
      where: { itemId: item.id, type: "AJUSTE" },
      orderBy: { createdAt: "desc" },
    });
    expect(bajada?.quantity).toBe(-1.5);

    await moveInventory(ADMIN, { itemId: item.id, kind: "AJUSTE", amount: 12, reason: "Sobraba" });
    const subida = await prisma.inventoryMovement.findFirst({
      where: { itemId: item.id, type: "AJUSTE" },
      orderBy: { createdAt: "desc" },
    });
    expect(subida?.quantity).toBe(3.5);
    expect(await stock(item.id)).toBe(12);
  });

  it("la existencia siempre cuadra con la suma de los movimientos", async () => {
    const item = await makeItem(10);

    await moveInventory(ADMIN, { itemId: item.id, kind: "ENTRADA", amount: 5, reason: "Compra" });
    await moveInventory(ADMIN, { itemId: item.id, kind: "SALIDA", amount: 2, reason: "Merma" });
    await moveInventory(ADMIN, { itemId: item.id, kind: "AJUSTE", amount: 11, reason: "Recuento" });

    const movements = await prisma.inventoryMovement.findMany({ where: { itemId: item.id } });
    const total = movements.reduce((sum, m) => {
      if (m.type === "ENTRADA" || m.type === "AJUSTE") return sum + m.quantity;
      return sum - m.quantity;
    }, 0);

    expect(total).toBe(await stock(item.id));
  });

  it("todo movimiento guarda usuario y motivo", async () => {
    const item = await makeItem(10);
    await moveInventory(ADMIN, { itemId: item.id, kind: "ENTRADA", amount: 1, reason: "Compra del lunes" });

    const movement = await prisma.inventoryMovement.findFirst({
      where: { itemId: item.id },
      orderBy: { createdAt: "desc" },
    });
    expect(movement?.userId).toBe(ADMIN.userId);
    expect(movement?.reason).toBe("Compra del lunes");
  });

  it("el motivo es obligatorio", async () => {
    const item = await makeItem(10);

    const result = await moveInventory(ADMIN, { itemId: item.id, kind: "ENTRADA", amount: 1, reason: "   " });

    expect(result.ok).toBe(false);
    expect(await stock(item.id)).toBe(10);
  });

  it("rechaza cantidades que no mueven nada", async () => {
    const item = await makeItem(10);

    expect((await moveInventory(ADMIN, { itemId: item.id, kind: "ENTRADA", amount: 0, reason: "x" })).ok).toBe(false);
    expect((await moveInventory(ADMIN, { itemId: item.id, kind: "SALIDA", amount: -3, reason: "x" })).ok).toBe(false);
    // Ajustar al mismo valor no es un movimiento.
    expect((await moveInventory(ADMIN, { itemId: item.id, kind: "AJUSTE", amount: 10, reason: "x" })).ok).toBe(false);
    expect(await stock(item.id)).toBe(10);
  });

  it("el ajuste deja rastro en auditoría", async () => {
    const item = await makeItem(10);
    await moveInventory(ADMIN, { itemId: item.id, kind: "AJUSTE", amount: 6, reason: "Recuento" });

    const entry = await prisma.auditLog.findFirst({ where: { action: "ajuste_inventario" } });
    expect(entry?.oldValue).toMatchObject({ existencia: 10 });
    expect(entry?.newValue).toMatchObject({ existencia: 6, motivo: "Recuento" });
  });

  it("el vendedor no puede mover inventario", async () => {
    const item = await makeItem(10);

    const result = await moveInventory(VENDEDOR, { itemId: item.id, kind: "SALIDA", amount: 5, reason: "x" });

    expect(result.ok).toBe(false);
    expect(await stock(item.id)).toBe(10);
  });
});

describe("editar insumo", () => {
  it("cambia nombre, unidad y mínimo sin tocar la existencia", async () => {
    const item = await makeItem(10);

    await updateInventoryItem(ADMIN, {
      itemId: item.id,
      name: "Hielo en bolsa",
      unit: "bulto",
      minimum: 3,
    });

    const updated = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
    expect(updated).toMatchObject({ name: "Hielo en bolsa", unit: "bulto", minimum: 3, quantity: 10 });
  });

  it("el vendedor no puede editarlo", async () => {
    const item = await makeItem(10);

    const result = await updateInventoryItem(VENDEDOR, {
      itemId: item.id,
      name: "Otro",
      unit: "kg",
      minimum: 1,
    });

    expect(result.ok).toBe(false);
  });
});

describe("eliminar insumo", () => {
  it("borra de verdad uno que nunca se usó", async () => {
    const item = await makeItem(0); // sin existencia inicial no hay movimientos

    const result = await removeInventoryItem(ADMIN, item.id);

    expect(result).toEqual({ ok: true, archived: false });
    expect(await prisma.inventoryItem.count({ where: { id: item.id } })).toBe(0);
  });

  it("archiva en vez de borrar cuando ya tuvo movimientos", async () => {
    const item = await makeItem(10);

    const result = await removeInventoryItem(ADMIN, item.id);

    expect(result).toEqual({ ok: true, archived: true });
    const stored = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
    expect(stored?.active).toBe(false);
    // El historial sobrevive: es lo que explica las ventas pasadas.
    expect(await prisma.inventoryMovement.count({ where: { itemId: item.id } })).toBe(1);
  });

  it("se niega si el insumo está conectado a un sabor, y dice cuál", async () => {
    const item = await makeItem(0);
    await prisma.flavor.create({
      data: { name: "Coco", inventoryItemId: item.id },
    });

    const result = await removeInventoryItem(ADMIN, item.id);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Decir solo "está conectado a un sabor" dejaba al administrador buscando
    // a ciegas cuál de todos.
    expect(result.error).toContain("sabor Coco");
    expect(result.error).toContain("Productos y precios");
    expect(result.usedBy).toEqual(["sabor Coco"]);
    expect(await prisma.inventoryItem.count({ where: { id: item.id } })).toBe(1);
  });

  it("nombra todo lo que lo usa, no solo lo primero que encuentra", async () => {
    const item = await makeItem(0);
    await prisma.flavor.create({ data: { name: "Coco", inventoryItemId: item.id } });
    await prisma.addon.create({
      data: { name: "Crema", price: 1000, cost: 300, inventoryItemId: item.id },
    });

    const result = await removeInventoryItem(ADMIN, item.id);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.usedBy).toEqual(["sabor Coco", "adición Crema"]);
    expect(result.error).toContain("sabor Coco y adición Crema");
  });

  it("nombra el tamaño cuando el estorbo es una receta", async () => {
    const item = await makeItem(0);
    await prisma.product.create({
      data: { id: "granizado_x", name: "Granizado", type: "granizado" },
    });
    const size = await prisma.size.create({
      data: { name: "Jumbo", price: 15000, productId: "granizado_x" },
    });
    await prisma.recipeLine.create({
      data: { sizeId: size.id, inventoryItemId: item.id, quantityPerUnit: 1 },
    });

    const result = await removeInventoryItem(ADMIN, item.id);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.usedBy).toEqual(["receta del tamaño Jumbo"]);
  });

  it("se niega si está en la receta de un tamaño", async () => {
    const item = await makeItem(0);
    await prisma.product.create({
      data: { id: "granizado", name: "Granizado", type: "granizado" },
    });
    const size = await prisma.size.create({
      data: { name: "Grande", price: 8000, productId: "granizado" },
    });
    await prisma.recipeLine.create({
      data: { sizeId: size.id, inventoryItemId: item.id, quantityPerUnit: 1 },
    });

    const result = await removeInventoryItem(ADMIN, item.id);

    expect(result.ok).toBe(false);
    expect(await prisma.inventoryItem.count({ where: { id: item.id } })).toBe(1);
  });

  it("el vendedor no puede eliminar", async () => {
    const item = await makeItem(0);

    const result = await removeInventoryItem(VENDEDOR, item.id);

    expect(result.ok).toBe(false);
    expect(await prisma.inventoryItem.count({ where: { id: item.id } })).toBe(1);
  });

  it("deja rastro en auditoría", async () => {
    const item = await makeItem(10);
    await removeInventoryItem(ADMIN, item.id);

    const entry = await prisma.auditLog.findFirst({
      where: { action: "insumo_archivado" },
    });
    expect(entry?.oldValue).toMatchObject({ nombre: "Hielo", movimientos: 1 });
  });
});
