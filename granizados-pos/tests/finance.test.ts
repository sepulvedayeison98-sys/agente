import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./reset";
import { registerSale } from "@/server/sales";
import { executeVoid } from "@/server/admin-sales";
import { financeSummary, rankings, top } from "@/server/finance";
import { resolvePeriod } from "@/server/periods";
import type { SessionPayload } from "@/lib/session-token";

const SARA: SessionPayload = {
  userId: "u_sara",
  role: "VENDEDOR",
  branchId: "b1",
  name: "Sara",
};
const JUAN: SessionPayload = {
  userId: "u_juan",
  role: "VENDEDOR",
  branchId: "b1",
  name: "Juan",
};
const ADMIN: SessionPayload = {
  userId: "u_admin",
  role: "ADMINISTRADOR",
  branchId: "b1",
  name: "Camilo",
};

const HOY = resolvePeriod("hoy");

async function seed() {
  await resetDatabase();

  await prisma.branch.create({ data: { id: "b1", name: "Sucursal" } });
  await prisma.user.createMany({
    data: [
      { id: "u_sara", name: "Sara", username: "sara", pinHash: "x", role: "VENDEDOR", branchId: "b1" },
      { id: "u_juan", name: "Juan", username: "juan", pinHash: "x", role: "VENDEDOR", branchId: "b1" },
      { id: "u_admin", name: "Camilo", username: "camilo", pinHash: "x", role: "ADMINISTRADOR", branchId: "b1" },
    ],
  });
  await prisma.product.create({
    data: { id: "granizado", name: "Granizado", type: "granizado" },
  });
  await prisma.size.createMany({
    data: [
      { id: "m", name: "Mediano", price: 6000, productId: "granizado" },
      { id: "g", name: "Grande", price: 8000, productId: "granizado" },
    ],
  });
  await prisma.flavor.createMany({
    data: [
      { id: "mango", name: "Mango" },
      { id: "mora", name: "Mora" },
    ],
  });
  await prisma.addon.create({
    data: { id: "leche", name: "Leche condensada", price: 1500, cost: 500 },
  });
  await prisma.expenseCategory.create({
    data: { id: "cat_mp", name: "Materia prima" },
  });
}

function sell(
  session: SessionPayload,
  options: {
    sizeId?: string;
    flavorId?: string;
    addonIds?: string[];
    quantity?: number;
    method?: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO";
  } = {},
) {
  return registerSale(session, {
    idempotencyKey: crypto.randomUUID(),
    method: options.method ?? "EFECTIVO",
    received: 100000,
    lines: [
      {
        sizeId: options.sizeId ?? "g",
        flavorId: options.flavorId ?? "mango",
        addonIds: options.addonIds ?? [],
        quantity: options.quantity ?? 1,
      },
    ],
  });
}

beforeEach(seed);

describe("resumen financiero", () => {
  it("suma ingresos y los separa por método", async () => {
    await sell(SARA, { method: "EFECTIVO" });
    await sell(SARA, { method: "TRANSFERENCIA", quantity: 2 });

    const summary = await financeSummary(HOY);

    expect(summary.revenue).toBe(24000);
    expect(summary.byMethod.EFECTIVO).toBe(8000);
    expect(summary.byMethod.TRANSFERENCIA).toBe(16000);
  });

  it("cuenta el costo de las adiciones vendidas", async () => {
    await sell(SARA, { addonIds: ["leche"], quantity: 3 });

    const summary = await financeSummary(HOY);

    // 3 adiciones a 500 de costo.
    expect(summary.productCost).toBe(1500);
  });

  it("utilidad = ventas − costo − gastos", async () => {
    await sell(SARA, { addonIds: ["leche"] });
    await prisma.expense.create({
      data: {
        concept: "Hielo",
        categoryId: "cat_mp",
        value: 3000,
        date: new Date(),
        method: "EFECTIVO",
      },
    });

    const summary = await financeSummary(HOY);

    expect(summary.revenue).toBe(9500);
    expect(summary.productCost).toBe(500);
    expect(summary.expenses).toBe(3000);
    expect(summary.profit).toBe(6000);
  });

  it("una venta anulada deja de contar en el resumen", async () => {
    const sale = await sell(SARA);
    expect(sale.ok).toBe(true);
    if (!sale.ok) return;

    await executeVoid(ADMIN, sale.number, "Anulada");

    const summary = await financeSummary(HOY);
    expect(summary.revenue).toBe(0);
    expect(summary.byMethod.EFECTIVO).toBe(0);
  });

  it("ignora los gastos fuera del período", async () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    await prisma.expense.create({
      data: {
        concept: "Gasto viejo",
        categoryId: "cat_mp",
        value: 50000,
        date: lastMonth,
        method: "EFECTIVO",
      },
    });

    const summary = await financeSummary(HOY);
    expect(summary.expenses).toBe(0);
  });

  it("un período sin movimiento da todo en cero", async () => {
    const summary = await financeSummary(resolvePeriod("ayer"));

    expect(summary.revenue).toBe(0);
    expect(summary.profit).toBe(0);
    expect(summary.byMethod.EFECTIVO).toBe(0);
  });
});

describe("reportes", () => {
  it("ordena los sabores por unidades vendidas", async () => {
    await sell(SARA, { flavorId: "mango", quantity: 3 });
    await sell(SARA, { flavorId: "mora", quantity: 5 });

    const report = await rankings(HOY);

    expect(report.flavors[0]).toEqual({ label: "Mora", value: 5 });
    expect(report.flavors[1]).toEqual({ label: "Mango", value: 3 });
  });

  it("no cuenta las ventas anuladas", async () => {
    const sale = await sell(SARA, { flavorId: "mora", quantity: 5 });
    await sell(SARA, { flavorId: "mango", quantity: 1 });
    if (!sale.ok) return;

    await executeVoid(ADMIN, sale.number, "Anulada");

    const report = await rankings(HOY);

    expect(report.flavors).toHaveLength(1);
    expect(report.flavors[0].label).toBe("Mango");
  });

  it("separa las ventas por empleado", async () => {
    await sell(SARA, { quantity: 2 });
    await sell(JUAN, { quantity: 1 });

    const report = await rankings(HOY);

    expect(report.sellers[0]).toEqual({ label: "Sara", value: 16000 });
    expect(report.sellers[1]).toEqual({ label: "Juan", value: 8000 });
  });

  it("usa el nombre guardado en la venta, no el actual", async () => {
    await sell(SARA, { sizeId: "g", quantity: 1 });
    await prisma.size.update({ where: { id: "g" }, data: { name: "Extra grande" } });

    const report = await rankings(HOY);

    // El reporte histórico conserva el nombre con que se vendió.
    expect(report.sizes[0].label).toBe("Grande");
  });

  it("agrupa los métodos de pago por valor vendido", async () => {
    await sell(SARA, { method: "EFECTIVO", quantity: 2 });
    await sell(SARA, { method: "TARJETA" });

    const report = await rankings(HOY);

    expect(report.methods[0]).toEqual({ label: "Efectivo", value: 16000 });
    expect(report.methods[1]).toEqual({ label: "Tarjeta", value: 8000 });
  });
});

describe("top", () => {
  it("ordena de mayor a menor y corta en el límite", () => {
    const map = new Map([["a", 1], ["b", 9], ["c", 5], ["d", 7]]);

    expect(top(map, 2)).toEqual([
      { label: "b", value: 9 },
      { label: "d", value: 7 },
    ]);
  });

  it("desempata por nombre para no variar entre corridas", () => {
    const map = new Map([["zeta", 5], ["alfa", 5]]);

    expect(top(map).map((row) => row.label)).toEqual(["alfa", "zeta"]);
  });

  it("con el mapa vacío devuelve una lista vacía", () => {
    expect(top(new Map())).toEqual([]);
  });
});
