"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export type CatalogKind = "sizes" | "flavors" | "addons";
export type ActionResult = { ok: true } | { ok: false; error: string };

const PRODUCT_ID = "granizado";

function revalidateCatalog() {
  // Lo que el administrador oculta debe desaparecer del POS de inmediato.
  revalidatePath("/admin/productos");
  revalidatePath("/pos");
}

export async function createCatalogItem(
  kind: CatalogKind,
  input: { name: string; price?: number; cost?: number },
): Promise<ActionResult> {
  await requireAdmin();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escribe un nombre." };

  const price = input.price ?? 0;
  const cost = input.cost ?? 0;
  if (kind !== "flavors" && (!Number.isFinite(price) || price < 0)) {
    return { ok: false, error: "El precio no es válido." };
  }

  if (kind === "sizes") {
    await prisma.size.create({
      data: { name, price, productId: PRODUCT_ID },
    });
  } else if (kind === "flavors") {
    await prisma.flavor.create({ data: { name } });
  } else {
    await prisma.addon.create({ data: { name, price, cost } });
  }

  revalidateCatalog();
  return { ok: true };
}

export async function updateCatalogItem(
  kind: CatalogKind,
  id: string,
  input: { name: string; price?: number },
): Promise<ActionResult> {
  const session = await requireAdmin();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escribe un nombre." };

  if (kind === "flavors") {
    await prisma.flavor.update({ where: { id }, data: { name } });
    revalidateCatalog();
    return { ok: true };
  }

  const price = input.price;
  if (price === undefined || !Number.isFinite(price) || price < 0) {
    return { ok: false, error: "El precio no es válido." };
  }

  const current =
    kind === "sizes"
      ? await prisma.size.findUnique({ where: { id }, select: { price: true } })
      : await prisma.addon.findUnique({ where: { id }, select: { price: true } });

  if (!current) return { ok: false, error: "El elemento ya no existe." };

  if (kind === "sizes") {
    await prisma.size.update({ where: { id }, data: { name, price } });
  } else {
    await prisma.addon.update({ where: { id }, data: { name, price } });
  }

  // Un cambio de precio solo afecta ventas nuevas; queda su rastro.
  if (current.price !== price) {
    await prisma.priceHistory.create({
      data: {
        entityType: kind === "sizes" ? "size" : "addon",
        entityId: id,
        oldValue: current.price,
        newValue: price,
        userId: session.userId,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "cambio_precio",
        entity: kind === "sizes" ? "Size" : "Addon",
        entityId: id,
        oldValue: { precio: current.price },
        newValue: { precio: price, nombre: name },
      },
    });
  }

  revalidateCatalog();
  return { ok: true };
}

export async function toggleCatalogVisibility(
  kind: CatalogKind,
  id: string,
): Promise<ActionResult> {
  const session = await requireAdmin();

  const current =
    kind === "sizes"
      ? await prisma.size.findUnique({ where: { id }, select: { visible: true, name: true } })
      : kind === "flavors"
        ? await prisma.flavor.findUnique({ where: { id }, select: { visible: true, name: true } })
        : await prisma.addon.findUnique({ where: { id }, select: { visible: true, name: true } });

  if (!current) return { ok: false, error: "El elemento ya no existe." };

  const visible = !current.visible;
  if (kind === "sizes") {
    await prisma.size.update({ where: { id }, data: { visible } });
  } else if (kind === "flavors") {
    await prisma.flavor.update({ where: { id }, data: { visible } });
  } else {
    await prisma.addon.update({ where: { id }, data: { visible } });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "cambio_visibilidad",
      entity: kind === "sizes" ? "Size" : kind === "flavors" ? "Flavor" : "Addon",
      entityId: id,
      oldValue: { visible: current.visible },
      newValue: { visible, nombre: current.name },
    },
  });

  revalidateCatalog();
  return { ok: true };
}
