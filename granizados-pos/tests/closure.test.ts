import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerSale } from "@/server/sales";
import { shiftSales, shiftStart, totalsByMethod } from "@/server/shift";
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

async function seed() {
  await prisma.cashMovement.deleteMany();
  await prisma.cashClosure.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.saleItemAddon.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.recipeLine.deleteMany();
  await prisma.addon.deleteMany();
  await prisma.flavor.deleteMany();
  await prisma.size.deleteMany();
  await prisma.product.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  await prisma.branch.create({ data: { id: "b1", name: "Sucursal" } });
  await prisma.user.createMany({
    data: [
      { id: "u_sara", name: "Sara", username: "sara", pinHash: "x", role: "VENDEDOR", branchId: "b1" },
      { id: "u_juan", name: "Juan", username: "juan", pinHash: "x", role: "VENDEDOR", branchId: "b1" },
    ],
  });
  await prisma.product.create({
    data: { id: "granizado", name: "Granizado", type: "granizado" },
  });
  await prisma.size.create({
    data: { id: "g", name: "Grande", price: 8000, productId: "granizado" },
  });
  await prisma.flavor.create({ data: { id: "mango", name: "Mango" } });
}

function sell(
  session: SessionPayload,
  method: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO",
  quantity = 1,
) {
  return registerSale(session, {
    idempotencyKey: crypto.randomUUID(),
    method,
    received: method === "EFECTIVO" ? 100000 : null,
    lines: [{ sizeId: "g", flavorId: "mango", addonIds: [], quantity }],
  });
}

beforeEach(seed);

describe("turno del vendedor", () => {
  it("suma solo las ventas del propio vendedor", async () => {
    await sell(SARA, "EFECTIVO");
    await sell(SARA, "TRANSFERENCIA");
    await sell(JUAN, "EFECTIVO");

    const from = await shiftStart(SARA.userId);
    const sales = await shiftSales(SARA.userId, from);
    const totals = totalsByMethod(sales);

    expect(sales).toHaveLength(2);
    expect(totals.EFECTIVO).toBe(8000);
    expect(totals.TRANSFERENCIA).toBe(8000);
  });

  it("el esperado en efectivo sale de las ventas reales del turno", async () => {
    await sell(SARA, "EFECTIVO", 2);
    await sell(SARA, "TARJETA");

    const from = await shiftStart(SARA.userId);
    const totals = totalsByMethod(await shiftSales(SARA.userId, from));

    expect(totals.EFECTIVO).toBe(16000);
    expect(totals.TARJETA).toBe(8000);
  });

  it("una venta anulada deja de contar para el cierre", async () => {
    const result = await sell(SARA, "EFECTIVO");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await prisma.sale.update({
      where: { number: result.number },
      data: { status: "ANULADA", voidReason: "prueba" },
    });

    const from = await shiftStart(SARA.userId);
    const totals = totalsByMethod(await shiftSales(SARA.userId, from));

    expect(totals.EFECTIVO).toBe(0);
  });

  it("el turno arranca después del último cierre", async () => {
    await sell(SARA, "EFECTIVO");

    const closedAt = new Date();
    await prisma.cashClosure.create({
      data: {
        shift: "Turno mañana",
        userId: SARA.userId,
        branchId: "b1",
        openedAt: new Date(Date.now() - 3_600_000),
        closedAt,
        expectedByMethod: { EFECTIVO: 8000, TRANSFERENCIA: 0, TARJETA: 0, OTRO: 0 },
        counted: 8000,
        difference: 0,
      },
    });

    const from = await shiftStart(SARA.userId);
    expect(from.getTime()).toBe(closedAt.getTime());

    // La venta anterior al cierre ya no pertenece al turno nuevo.
    const sales = await shiftSales(SARA.userId, from);
    expect(sales).toHaveLength(0);

    await sell(SARA, "EFECTIVO");
    expect(await shiftSales(SARA.userId, await shiftStart(SARA.userId))).toHaveLength(1);
  });

  it("cada vendedor tiene su propio turno", async () => {
    await sell(JUAN, "EFECTIVO");
    await prisma.cashClosure.create({
      data: {
        shift: "Turno mañana",
        userId: SARA.userId,
        branchId: "b1",
        openedAt: new Date(Date.now() - 3_600_000),
        closedAt: new Date(),
        expectedByMethod: { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, OTRO: 0 },
        counted: 0,
        difference: 0,
      },
    });

    // El cierre de Sara no debe recortar el turno de Juan.
    const juanSales = await shiftSales(JUAN.userId, await shiftStart(JUAN.userId));
    expect(juanSales).toHaveLength(1);
  });
});
