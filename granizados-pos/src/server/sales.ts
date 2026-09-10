import "server-only";
import type { PaymentMethod } from "@/generated/prisma/enums";
import type { AddonModel, FlavorModel, SizeModel } from "@/generated/prisma/models";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session-token";
import { computeConsumption, round } from "@/server/inventory";
import { getSetting } from "@/server/settings";

export type SaleRequestLine = {
  sizeId: string;
  flavorId: string;
  addonIds: string[];
  quantity: number;
};

export type SaleRequest = {
  idempotencyKey: string;
  method: PaymentMethod;
  received: number | null;
  lines: SaleRequestLine[];
};

export type SaleResult =
  | { ok: true; number: number; total: number; change: number; alreadyExisted: boolean }
  | { ok: false; error: string };

const MAX_NUMBER_RETRIES = 5;

/**
 * Tope por línea. No es una regla de negocio sino un cortafuegos: cincuenta
 * vasos es más de lo que cabe en un mostrador, y sin techo un dedo pegado en
 * el teclado deja el inventario en un negativo enorme y contamina la utilidad
 * y el ticket promedio de todo el día.
 */
export const MAX_QUANTITY_PER_LINE = 50;

/**
 * Registra una venta. Nunca confía en los precios que manda el cliente: vuelve a
 * leerlos de la base y los congela en la venta, de modo que un cambio de precio
 * posterior no altera las ventas históricas.
 */
export async function registerSale(
  session: SessionPayload,
  request: SaleRequest,
): Promise<SaleResult> {
  if (!request.idempotencyKey) {
    return { ok: false, error: "Falta la clave de idempotencia." };
  }
  if (!request.lines.length) {
    return { ok: false, error: "El carrito está vacío." };
  }
  if (request.lines.some((line) => !Number.isInteger(line.quantity) || line.quantity < 1)) {
    return { ok: false, error: "Hay una cantidad inválida en el carrito." };
  }
  if (request.lines.some((line) => line.quantity > MAX_QUANTITY_PER_LINE)) {
    return {
      ok: false,
      error: `No se pueden vender más de ${MAX_QUANTITY_PER_LINE} unidades de una misma combinación. Divide la venta.`,
    };
  }

  // Doble toque: si la clave ya existe, devuelve la venta que ya se registró.
  const existing = await prisma.sale.findUnique({
    where: { idempotencyKey: request.idempotencyKey },
  });
  if (existing) {
    return {
      ok: true,
      number: existing.number,
      total: existing.total,
      change: computeChange(request.method, request.received, existing.total),
      alreadyExisted: true,
    };
  }

  const [sizes, flavors, addons] = await Promise.all([
    prisma.size.findMany({
      where: { id: { in: request.lines.map((l) => l.sizeId) } },
    }),
    prisma.flavor.findMany({
      where: { id: { in: request.lines.map((l) => l.flavorId) } },
    }),
    prisma.addon.findMany({
      where: { id: { in: request.lines.flatMap((l) => l.addonIds) } },
    }),
  ]);

  const sizeById = new Map(sizes.map((s) => [s.id, s]));
  const flavorById = new Map(flavors.map((f) => [f.id, f]));
  const addonById = new Map(addons.map((a) => [a.id, a]));

  type PricedLine = {
    line: SaleRequestLine;
    size: SizeModel;
    flavor: FlavorModel;
    addons: AddonModel[];
    unitPrice: number;
  };

  const priced: PricedLine[] = [];
  for (const line of request.lines) {
    const size = sizeById.get(line.sizeId);
    const flavor = flavorById.get(line.flavorId);
    // Lo que el administrador ocultó o desactivó no se puede vender.
    if (!size || !size.visible || !size.active) {
      return { ok: false, error: "Un tamaño del carrito ya no está disponible." };
    }
    if (!flavor || !flavor.visible || !flavor.active) {
      return { ok: false, error: "Un sabor del carrito ya no está disponible." };
    }

    const lineAddons: AddonModel[] = [];
    for (const addonId of line.addonIds) {
      const addon = addonById.get(addonId);
      if (!addon || !addon.visible || !addon.active) {
        return { ok: false, error: "Una adición del carrito ya no está disponible." };
      }
      lineAddons.push(addon);
    }

    const unitPrice =
      size.price + lineAddons.reduce((total, a) => total + a.price, 0);

    priced.push({ line, size, flavor, addons: lineAddons, unitPrice });
  }

  const total = priced.reduce(
    (sum, item) => sum + item.unitPrice * item.line.quantity,
    0,
  );

  if (request.method === "EFECTIVO") {
    const received = request.received ?? 0;
    if (received < total) {
      return { ok: false, error: "El dinero recibido es menor al total." };
    }
  }

  // Cada venta confirmada descuenta inventario según la receta configurada,
  // salvo que el administrador apague el descuento automático.
  const autoDeduct = await getSetting("descuento_inventario");
  const recipes = autoDeduct
    ? await prisma.recipeLine.findMany({
        where: { sizeId: { in: priced.map((item) => item.size.id) } },
        select: {
          sizeId: true,
          inventoryItemId: true,
          resolveItemFromFlavor: true,
          quantityPerUnit: true,
        },
      })
    : [];

  const consumption = autoDeduct
    ? computeConsumption(
        priced.map((item) => ({
          sizeId: item.size.id,
          flavorInventoryItemId: item.flavor.inventoryItemId,
          quantity: item.line.quantity,
          addons: item.addons.map((addon) => ({
            inventoryItemId: addon.inventoryItemId,
            useQuantityPerUnit: addon.useQuantityPerUnit,
          })),
        })),
        recipes,
      )
    : new Map<string, number>();

  for (let attempt = 0; attempt < MAX_NUMBER_RETRIES; attempt++) {
    const last = await prisma.sale.findFirst({
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = (last?.number ?? 0) + 1;

    try {
      const sale = await prisma.$transaction(async (tx) => {
        const created = await tx.sale.create({
          data: {
            number,
            branchId: session.branchId,
            userId: session.userId,
            method: request.method,
            total,
            idempotencyKey: request.idempotencyKey,
            items: {
              create: priced.map((item) => ({
                sizeId: item.size.id,
                flavorId: item.flavor.id,
                quantity: item.line.quantity,
                unitPrice: item.unitPrice,
                sizeName: item.size.name,
                flavorName: item.flavor.name,
                addons: {
                  create: item.addons.map((addon) => ({
                    addonId: addon.id,
                    price: addon.price,
                    addonName: addon.name,
                  })),
                },
              })),
            },
          },
        });

        // Mismo commit que la venta: no puede quedar una venta sin su descuento.
        for (const [itemId, quantity] of consumption) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: itemId },
            select: { quantity: true },
          });
          if (!item) continue;

          await tx.inventoryItem.update({
            where: { id: itemId },
            data: { quantity: round(item.quantity - quantity) },
          });
          await tx.inventoryMovement.create({
            data: {
              itemId,
              type: "VENTA",
              quantity,
              userId: session.userId,
              reason: `Venta #${number}`,
              saleId: created.id,
            },
          });
        }

        return created;
      });

      return {
        ok: true,
        number: sale.number,
        total: sale.total,
        change: computeChange(request.method, request.received, total),
        alreadyExisted: false,
      };
    } catch (error) {
      // La forma del error de unicidad cambia entre conectores, así que en vez
      // de interpretarla se mira el estado de la base, que es inequívoco.

      // Otro intento con la misma clave ganó la carrera: esa es la venta.
      const concurrent = await prisma.sale.findUnique({
        where: { idempotencyKey: request.idempotencyKey },
      });
      if (concurrent) {
        return {
          ok: true,
          number: concurrent.number,
          total: concurrent.total,
          change: computeChange(request.method, request.received, concurrent.total),
          alreadyExisted: true,
        };
      }

      // Otra caja se llevó el consecutivo: reintenta con el siguiente.
      const taken = await prisma.sale.findUnique({ where: { number } });
      if (taken) continue;

      throw error;
    }
  }

  return { ok: false, error: "No se pudo asignar el número de venta. Intenta de nuevo." };
}

function computeChange(
  method: PaymentMethod,
  received: number | null,
  total: number,
): number {
  if (method !== "EFECTIVO") return 0;
  return Math.max(0, (received ?? 0) - total);
}

