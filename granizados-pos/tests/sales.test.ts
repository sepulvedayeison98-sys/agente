import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerSale } from "@/server/sales";
import type { SessionPayload } from "@/lib/session-token";

const SESSION: SessionPayload = {
  userId: "u_test",
  role: "VENDEDOR",
  branchId: "b_test",
  name: "Vendedora de prueba",
};

async function resetCatalog() {
  await prisma.saleItemAddon.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.recipeLine.deleteMany();
  await prisma.addon.deleteMany();
  await prisma.flavor.deleteMany();
  await prisma.size.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  await prisma.branch.create({
    data: { id: "b_test", name: "Sucursal de prueba", isDefault: true },
  });
  await prisma.user.create({
    data: {
      id: "u_test",
      name: "Vendedora de prueba",
      username: "test",
      pinHash: "x",
      role: "VENDEDOR",
      branchId: "b_test",
    },
  });
  await prisma.product.create({
    data: { id: "granizado", name: "Granizado", type: "granizado" },
  });
  await prisma.size.createMany({
    data: [
      { id: "g", name: "Grande", price: 8000, productId: "granizado" },
      { id: "oculto", name: "Oculto", price: 5000, productId: "granizado", visible: false },
    ],
  });
  await prisma.flavor.create({ data: { id: "mango", name: "Mango" } });
  await prisma.addon.create({
    data: { id: "leche", name: "Leche condensada", price: 1500, cost: 500 },
  });
}

function request(overrides: Partial<Parameters<typeof registerSale>[1]> = {}) {
  return {
    idempotencyKey: crypto.randomUUID(),
    method: "EFECTIVO" as const,
    received: 20000,
    lines: [{ sizeId: "g", flavorId: "mango", addonIds: ["leche"], quantity: 1 }],
    ...overrides,
  };
}

beforeEach(resetCatalog);

describe("registerSale", () => {
  it("calcula el total con los precios de la base, no con los del cliente", async () => {
    const result = await registerSale(SESSION, request());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Grande 8.000 + leche condensada 1.500
    expect(result.total).toBe(9500);
    expect(result.change).toBe(10500);
  });

  it("congela el precio: cambiarlo después no altera la venta histórica", async () => {
    const result = await registerSale(SESSION, request());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await prisma.size.update({ where: { id: "g" }, data: { price: 12000 } });
    await prisma.addon.update({ where: { id: "leche" }, data: { price: 3000 } });

    const sale = await prisma.sale.findUnique({
      where: { number: result.number },
      include: { items: { include: { addons: true } } },
    });

    expect(sale?.total).toBe(9500);
    expect(sale?.items[0].unitPrice).toBe(9500);
    expect(sale?.items[0].addons[0].price).toBe(1500);
    // El snapshot del nombre también queda guardado con la venta.
    expect(sale?.items[0].sizeName).toBe("Grande");
  });

  it("no duplica la venta si se confirma dos veces con la misma clave", async () => {
    const payload = request();

    const first = await registerSale(SESSION, payload);
    const second = await registerSale(SESSION, payload);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.number).toBe(first.number);
    expect(second.alreadyExisted).toBe(true);
    expect(await prisma.sale.count()).toBe(1);
  });

  it("no duplica la venta con dos confirmaciones simultáneas", async () => {
    const payload = request();

    const results = await Promise.all([
      registerSale(SESSION, payload),
      registerSale(SESSION, payload),
    ]);

    expect(results.every((r) => r.ok)).toBe(true);
    expect(await prisma.sale.count()).toBe(1);
  });

  it("rechaza vender algo que el administrador ocultó", async () => {
    const result = await registerSale(
      SESSION,
      request({
        lines: [{ sizeId: "oculto", flavorId: "mango", addonIds: [], quantity: 1 }],
      }),
    );

    expect(result.ok).toBe(false);
    expect(await prisma.sale.count()).toBe(0);
  });

  it("rechaza el efectivo insuficiente", async () => {
    const result = await registerSale(SESSION, request({ received: 5000 }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("menor al total");
    expect(await prisma.sale.count()).toBe(0);
  });

  it("no exige dinero recibido cuando el pago no es en efectivo", async () => {
    const result = await registerSale(
      SESSION,
      request({ method: "TARJETA", received: null }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.change).toBe(0);
  });

  it("rechaza cantidades inválidas", async () => {
    const result = await registerSale(
      SESSION,
      request({
        lines: [{ sizeId: "g", flavorId: "mango", addonIds: [], quantity: 0 }],
      }),
    );

    expect(result.ok).toBe(false);
    expect(await prisma.sale.count()).toBe(0);
  });

  it("numera las ventas de forma consecutiva", async () => {
    const first = await registerSale(SESSION, request());
    const second = await registerSale(SESSION, request());

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.number).toBe(first.number + 1);
  });
});
