import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerSale } from "@/server/sales";
import { executeVoid } from "@/server/admin-sales";
import { totalsByMethod } from "@/server/shift";
import type { SessionPayload } from "@/lib/session-token";

const SARA: SessionPayload = {
  userId: "u_sara",
  role: "VENDEDOR",
  branchId: "b1",
  name: "Sara",
};
const ADMIN: SessionPayload = {
  userId: "u_admin",
  role: "ADMINISTRADOR",
  branchId: "b1",
  name: "Camilo",
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
      { id: "u_admin", name: "Camilo", username: "camilo", pinHash: "x", role: "ADMINISTRADOR", branchId: "b1" },
    ],
  });
  await prisma.inventoryItem.createMany({
    data: [
      { id: "hielo", name: "Hielo", unit: "kg", quantity: 35, minimum: 10 },
      { id: "p_mango", name: "Pulpa de mango", unit: "kg", quantity: 12, minimum: 5 },
      { id: "v_gra", name: "Vasos grandes", unit: "unid", quantity: 85, minimum: 20 },
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
  await prisma.flavor.create({
    data: { id: "mango", name: "Mango", inventoryItemId: "p_mango" },
  });
}

async function sell(quantity = 1) {
  const result = await registerSale(SARA, {
    idempotencyKey: crypto.randomUUID(),
    method: "EFECTIVO",
    received: 100000,
    lines: [{ sizeId: "g", flavorId: "mango", addonIds: [], quantity }],
  });
  if (!result.ok) throw new Error(result.error);
  return result;
}

const stock = async (id: string) =>
  (await prisma.inventoryItem.findUnique({ where: { id } }))?.quantity ?? null;

beforeEach(seed);

describe("anulación de venta", () => {
  it("no borra la venta: la deja registrada como anulada con motivo y responsable", async () => {
    const sale = await sell();

    const result = await executeVoid(ADMIN, sale.number, "Cobro duplicado");
    expect(result.ok).toBe(true);

    const stored = await prisma.sale.findUnique({ where: { number: sale.number } });
    expect(stored).not.toBeNull();
    expect(stored?.status).toBe("ANULADA");
    expect(stored?.voidReason).toBe("Cobro duplicado");
    expect(stored?.voidedById).toBe(ADMIN.userId);
    // El total original se conserva.
    expect(stored?.total).toBe(8000);
  });

  it("devuelve al inventario lo que la venta había descontado", async () => {
    const before = { vasos: await stock("v_gra"), hielo: await stock("hielo"), pulpa: await stock("p_mango") };
    const sale = await sell(2);

    expect(await stock("v_gra")).toBe(before.vasos! - 2);

    await executeVoid(ADMIN, sale.number, "Producto devuelto");

    expect(await stock("v_gra")).toBe(before.vasos);
    expect(await stock("hielo")).toBe(before.hielo);
    expect(await stock("p_mango")).toBe(before.pulpa);
  });

  it("registra la devolución como movimiento de entrada, sin borrar el de venta", async () => {
    const sale = await sell();
    await executeVoid(ADMIN, sale.number, "Error de digitación");

    const movements = await prisma.inventoryMovement.findMany({
      where: { itemId: "hielo" },
      orderBy: { createdAt: "asc" },
    });

    expect(movements).toHaveLength(2);
    expect(movements[0].type).toBe("VENTA");
    expect(movements[1].type).toBe("ENTRADA");
    expect(movements[1].reason).toBe(`Anulación de venta #${sale.number}`);
    expect(movements[1].userId).toBe(ADMIN.userId);
  });

  it("deja rastro en auditoría con el estado anterior", async () => {
    const sale = await sell();
    await executeVoid(ADMIN, sale.number, "Cliente se retractó");

    const entry = await prisma.auditLog.findFirst({ where: { action: "anular_venta" } });

    expect(entry?.userId).toBe(ADMIN.userId);
    expect(entry?.oldValue).toMatchObject({ status: "OK", total: 8000 });
    expect(entry?.newValue).toMatchObject({ status: "ANULADA", motivo: "Cliente se retractó" });
  });

  it("una venta anulada deja de sumar en los totales", async () => {
    const sale = await sell();
    await executeVoid(ADMIN, sale.number, "Anulada");

    const sales = await prisma.sale.findMany();
    expect(totalsByMethod(sales).EFECTIVO).toBe(0);
  });

  it("el vendedor no puede anular: solo el administrador", async () => {
    const sale = await sell();

    const result = await executeVoid(SARA, sale.number, "Quiero anularla");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("administrador");

    const stored = await prisma.sale.findUnique({ where: { number: sale.number } });
    expect(stored?.status).toBe("OK");
  });

  it("exige un motivo", async () => {
    const sale = await sell();

    const result = await executeVoid(ADMIN, sale.number, "   ");

    expect(result.ok).toBe(false);
    const stored = await prisma.sale.findUnique({ where: { number: sale.number } });
    expect(stored?.status).toBe("OK");
  });

  it("no anula dos veces ni devuelve el inventario por duplicado", async () => {
    const sale = await sell();
    const afterSale = (await stock("v_gra"))!;

    await executeVoid(ADMIN, sale.number, "Primera");
    const afterVoid = (await stock("v_gra"))!;
    expect(afterVoid).toBe(afterSale + 1);

    const second = await executeVoid(ADMIN, sale.number, "Segunda");

    expect(second.ok).toBe(false);
    // El segundo intento no vuelve a sumar el vaso.
    expect(await stock("v_gra")).toBe(afterVoid);
  });

  it("rechaza una venta que no existe", async () => {
    const result = await executeVoid(ADMIN, 99999, "No existe");
    expect(result.ok).toBe(false);
  });
});
