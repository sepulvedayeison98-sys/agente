import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./reset";
import { registerSale } from "@/server/sales";
import { computeConsumption } from "@/server/inventory";
import type { SessionPayload } from "@/lib/session-token";

const SESSION: SessionPayload = {
  userId: "u_inv",
  role: "VENDEDOR",
  branchId: "b_inv",
  name: "Vendedora de prueba",
};

// Recetas del prototipo: vaso 1 unidad, hielo y pulpa por tamaño.
async function seedInventoryScenario() {
  await resetDatabase();

  await prisma.branch.create({
    data: { id: "b_inv", name: "Sucursal", isDefault: true },
  });
  await prisma.user.create({
    data: {
      id: "u_inv",
      name: "Vendedora de prueba",
      username: "inv",
      pinHash: "x",
      role: "VENDEDOR",
      branchId: "b_inv",
    },
  });
  await prisma.inventoryItem.createMany({
    data: [
      { id: "hielo", name: "Hielo", unit: "kg", quantity: 35, minimum: 10 },
      { id: "p_mango", name: "Pulpa de mango", unit: "kg", quantity: 12, minimum: 5 },
      { id: "p_mora", name: "Pulpa de mora", unit: "kg", quantity: 7, minimum: 5 },
      { id: "v_gra", name: "Vasos grandes", unit: "unid", quantity: 85, minimum: 20 },
      { id: "leche", name: "Leche condensada", unit: "latas", quantity: 6, minimum: 2 },
    ],
  });
  await prisma.product.create({
    data: { id: "granizado", name: "Granizado", type: "granizado" },
  });
  await prisma.size.create({
    data: { id: "g", name: "Grande", price: 8000, productId: "granizado" },
  });
  await prisma.recipeLine.createMany({
    data: [
      { sizeId: "g", inventoryItemId: "v_gra", quantityPerUnit: 1 },
      { sizeId: "g", inventoryItemId: "hielo", quantityPerUnit: 0.5 },
      { sizeId: "g", resolveItemFromFlavor: true, quantityPerUnit: 0.12 },
    ],
  });
  await prisma.flavor.createMany({
    data: [
      { id: "mango", name: "Mango", inventoryItemId: "p_mango" },
      { id: "mora", name: "Mora", inventoryItemId: "p_mora" },
    ],
  });
  await prisma.addon.create({
    data: {
      id: "leche",
      name: "Leche condensada",
      price: 1500,
      cost: 500,
      inventoryItemId: "leche",
      useQuantityPerUnit: 0.08,
    },
  });
}

async function stock(id: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  return item?.quantity ?? null;
}

beforeEach(seedInventoryScenario);

describe("descuento de inventario", () => {
  it("descuenta vaso, hielo y la pulpa del sabor vendido", async () => {
    const result = await registerSale(SESSION, {
      idempotencyKey: crypto.randomUUID(),
      method: "EFECTIVO",
      received: 10000,
      lines: [{ sizeId: "g", flavorId: "mango", addonIds: [], quantity: 1 }],
    });

    expect(result.ok).toBe(true);
    expect(await stock("v_gra")).toBe(84);
    expect(await stock("hielo")).toBe(34.5);
    expect(await stock("p_mango")).toBe(11.88);
    // El sabor no vendido queda intacto.
    expect(await stock("p_mora")).toBe(7);
  });

  it("multiplica el consumo por la cantidad vendida", async () => {
    await registerSale(SESSION, {
      idempotencyKey: crypto.randomUUID(),
      method: "EFECTIVO",
      received: 50000,
      lines: [{ sizeId: "g", flavorId: "mango", addonIds: [], quantity: 3 }],
    });

    expect(await stock("v_gra")).toBe(82);
    expect(await stock("hielo")).toBe(33.5);
    expect(await stock("p_mango")).toBe(11.64);
  });

  it("descuenta el insumo de cada adición", async () => {
    await registerSale(SESSION, {
      idempotencyKey: crypto.randomUUID(),
      method: "EFECTIVO",
      received: 50000,
      lines: [{ sizeId: "g", flavorId: "mango", addonIds: ["leche"], quantity: 2 }],
    });

    expect(await stock("leche")).toBe(5.84);
  });

  it("suma el consumo cuando dos líneas comparten insumo", async () => {
    await registerSale(SESSION, {
      idempotencyKey: crypto.randomUUID(),
      method: "EFECTIVO",
      received: 50000,
      lines: [
        { sizeId: "g", flavorId: "mango", addonIds: [], quantity: 1 },
        { sizeId: "g", flavorId: "mora", addonIds: [], quantity: 1 },
      ],
    });

    // Hielo y vasos se suman entre líneas; cada pulpa baja por su lado.
    expect(await stock("v_gra")).toBe(83);
    expect(await stock("hielo")).toBe(34);
    expect(await stock("p_mango")).toBe(11.88);
    expect(await stock("p_mora")).toBe(6.88);
  });

  it("registra un movimiento por insumo con usuario y motivo", async () => {
    const result = await registerSale(SESSION, {
      idempotencyKey: crypto.randomUUID(),
      method: "EFECTIVO",
      received: 10000,
      lines: [{ sizeId: "g", flavorId: "mango", addonIds: ["leche"], quantity: 1 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const movements = await prisma.inventoryMovement.findMany();

    expect(movements).toHaveLength(4);
    for (const movement of movements) {
      expect(movement.type).toBe("VENTA");
      expect(movement.userId).toBe(SESSION.userId);
      expect(movement.reason).toBe(`Venta #${result.number}`);
      expect(movement.saleId).not.toBeNull();
    }

    const ice = movements.find((m) => m.itemId === "hielo");
    expect(ice?.quantity).toBe(0.5);
  });

  it("no toca el inventario si la venta es rechazada", async () => {
    const result = await registerSale(SESSION, {
      idempotencyKey: crypto.randomUUID(),
      method: "EFECTIVO",
      received: 100,
      lines: [{ sizeId: "g", flavorId: "mango", addonIds: [], quantity: 1 }],
    });

    expect(result.ok).toBe(false);
    expect(await stock("v_gra")).toBe(85);
    expect(await stock("hielo")).toBe(35);
    expect(await prisma.inventoryMovement.count()).toBe(0);
  });

  it("no descuenta dos veces si se confirma dos veces con la misma clave", async () => {
    const payload = {
      idempotencyKey: crypto.randomUUID(),
      method: "EFECTIVO" as const,
      received: 10000,
      lines: [{ sizeId: "g", flavorId: "mango", addonIds: [], quantity: 1 }],
    };

    await registerSale(SESSION, payload);
    await registerSale(SESSION, payload);

    expect(await stock("v_gra")).toBe(84);
    expect(await prisma.inventoryMovement.count()).toBe(3);
  });

  it("mantiene el inventario cuadrado con los movimientos registrados", async () => {
    await registerSale(SESSION, {
      idempotencyKey: crypto.randomUUID(),
      method: "EFECTIVO",
      received: 50000,
      lines: [{ sizeId: "g", flavorId: "mango", addonIds: ["leche"], quantity: 2 }],
    });

    const movements = await prisma.inventoryMovement.findMany({
      where: { itemId: "hielo" },
    });
    const consumed = movements.reduce((total, m) => total + m.quantity, 0);

    expect((await stock("hielo"))! + consumed).toBe(35);
  });
});

describe("computeConsumption", () => {
  it("no acumula residuos de coma flotante", () => {
    const consumption = computeConsumption(
      [
        {
          sizeId: "g",
          flavorInventoryItemId: "pulpa",
          quantity: 3,
          addons: [{ inventoryItemId: "crema", useQuantityPerUnit: 0.1 }],
        },
      ],
      [{ sizeId: "g", inventoryItemId: "hielo", resolveItemFromFlavor: false, quantityPerUnit: 0.2 }],
    );

    expect(consumption.get("hielo")).toBe(0.6);
    expect(consumption.get("crema")).toBe(0.3);
  });

  it("ignora recetas de otros tamaños", () => {
    const consumption = computeConsumption(
      [{ sizeId: "g", flavorInventoryItemId: null, quantity: 1, addons: [] }],
      [
        { sizeId: "p", inventoryItemId: "v_peq", resolveItemFromFlavor: false, quantityPerUnit: 1 },
        { sizeId: "g", inventoryItemId: "v_gra", resolveItemFromFlavor: false, quantityPerUnit: 1 },
      ],
    );

    expect(consumption.has("v_peq")).toBe(false);
    expect(consumption.get("v_gra")).toBe(1);
  });

  it("omite la pulpa cuando el sabor no tiene insumo asociado", () => {
    const consumption = computeConsumption(
      [{ sizeId: "g", flavorInventoryItemId: null, quantity: 1, addons: [] }],
      [{ sizeId: "g", inventoryItemId: null, resolveItemFromFlavor: true, quantityPerUnit: 0.12 }],
    );

    expect(consumption.size).toBe(0);
  });
});
