import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./reset";
import { createCatalogItem, updateCatalogLink } from "@/server/actions/catalog";
import { registerSale } from "@/server/sales";
import type { SessionPayload } from "@/lib/session-token";

vi.mock("@/lib/dal", () => ({
  requireAdmin: async () => SESSION,
  verifySession: async () => SESSION,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const SESSION: SessionPayload = {
  userId: "u_admin",
  role: "ADMINISTRADOR",
  branchId: "b1",
  name: "Esteban",
};

async function seed() {
  await resetDatabase();
  await prisma.branch.create({ data: { id: "b1", name: "Sucursal" } });
  await prisma.user.create({
    data: {
      id: "u_admin",
      name: "Esteban",
      username: "esteban",
      pinHash: "x",
      role: "ADMINISTRADOR",
      branchId: "b1",
    },
  });
  await prisma.product.create({
    data: { id: "granizado", name: "Granizado", type: "granizado" },
  });
  await prisma.size.create({
    data: { id: "med", name: "Mediano", price: 6000, productId: "granizado" },
  });
  await prisma.flavor.create({ data: { id: "pina", name: "Piña" } });
  await prisma.inventoryItem.create({
    data: { id: "l_ron", name: "Ron", unit: "ml", quantity: 700, minimum: 500 },
  });
}

const addon = async (name: string) =>
  prisma.addon.findFirstOrThrow({ where: { name } });

beforeEach(seed);

describe("adiciones con licor", () => {
  it("se crean marcadas", async () => {
    const result = await createCatalogItem("addons", {
      name: "Ron",
      price: 6000,
      cost: 2500,
      isLiquor: true,
    });

    expect(result.ok).toBe(true);
    expect((await addon("Ron")).isLiquor).toBe(true);
  });

  it("una adición normal no queda marcada", async () => {
    await createCatalogItem("addons", { name: "Gomitas", price: 1000, cost: 350 });

    expect((await addon("Gomitas")).isLiquor).toBe(false);
  });

  it("la marca se puede poner y quitar después", async () => {
    await createCatalogItem("addons", { name: "Ron", price: 6000, cost: 2500 });
    const ron = await addon("Ron");

    await updateCatalogLink("addons", ron.id, { isLiquor: true });
    expect((await addon("Ron")).isLiquor).toBe(true);

    await updateCatalogLink("addons", ron.id, { isLiquor: false });
    expect((await addon("Ron")).isLiquor).toBe(false);
  });

  it("editar el insumo sin tocar la marca no la borra", async () => {
    await createCatalogItem("addons", {
      name: "Ron",
      price: 6000,
      cost: 2500,
      isLiquor: true,
    });
    const ron = await addon("Ron");

    // La pantalla de recetas no manda isLiquor; el trago debe seguir siéndolo.
    await updateCatalogLink("addons", ron.id, {
      inventoryItemId: "l_ron",
      useQuantityPerUnit: 40,
    });

    expect((await addon("Ron")).isLiquor).toBe(true);
  });

  it("el licor descuenta su insumo como cualquier otra adición", async () => {
    await createCatalogItem("addons", {
      name: "Ron",
      price: 6000,
      cost: 2500,
      isLiquor: true,
      inventoryItemId: "l_ron",
      useQuantityPerUnit: 40,
    });
    const ron = await addon("Ron");

    const sale = await registerSale(SESSION, {
      idempotencyKey: "k1",
      method: "EFECTIVO",
      received: 30000,
      lines: [
        { sizeId: "med", flavorId: "pina", addonIds: [ron.id], quantity: 2 },
      ],
    });

    expect(sale.ok).toBe(true);
    if (!sale.ok) return;
    // 700 ml menos dos tragos de 40.
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: "l_ron" } })).quantity).toBe(620);
    expect(sale.total).toBe((6000 + 6000) * 2);
  });

  it("la venta guarda el nombre del licor congelado", async () => {
    await createCatalogItem("addons", {
      name: "Ron",
      price: 6000,
      cost: 2500,
      isLiquor: true,
    });
    const ron = await addon("Ron");

    await registerSale(SESSION, {
      idempotencyKey: "k2",
      method: "EFECTIVO",
      received: 20000,
      lines: [{ sizeId: "med", flavorId: "pina", addonIds: [ron.id], quantity: 1 }],
    });

    const stored = await prisma.saleItemAddon.findFirstOrThrow();
    expect(stored.addonName).toBe("Ron");
    expect(stored.price).toBe(6000);
  });
});
