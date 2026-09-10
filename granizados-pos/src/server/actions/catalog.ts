"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isFlavorColor } from "@/lib/flavor-colors";

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
  input: {
    name: string;
    price?: number;
    cost?: number;
    // Sin insumo asociado, vender esto no descontaría nada del inventario.
    inventoryItemId?: string | null;
    useQuantityPerUnit?: number;
    recipe?: RecipeInput;
    color?: string | null;
  },
): Promise<ActionResult> {
  await requireAdmin();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escribe un nombre." };

  const price = input.price ?? 0;
  const cost = input.cost ?? 0;
  if (kind !== "flavors" && (!Number.isFinite(price) || price < 0)) {
    return { ok: false, error: "El precio no es válido." };
  }

  const inventoryItemId = input.inventoryItemId || null;
  if (inventoryItemId) {
    const exists = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: { id: true },
    });
    if (!exists) return { ok: false, error: "Ese insumo ya no existe." };
  }

  if (kind === "sizes") {
    const size = await prisma.size.create({
      data: { name, price, productId: PRODUCT_ID },
    });
    await saveSizeRecipe(size.id, input.recipe);
  } else if (kind === "flavors") {
    await prisma.flavor.create({
      data: { name, inventoryItemId, color: cleanColor(input.color) },
    });
  } else {
    await prisma.addon.create({
      data: {
        name,
        price,
        cost,
        inventoryItemId,
        useQuantityPerUnit: Math.max(0, input.useQuantityPerUnit ?? 0),
      },
    });
  }

  revalidateCatalog();
  return { ok: true };
}

export type RecipeInput = {
  cupItemId?: string | null;
  iceItemId?: string | null;
  ice?: number;
  pulp?: number;
};

/**
 * Receta de un tamaño: el vaso y el hielo son insumos fijos que elige el
 * administrador; la pulpa lleva resolveItemFromFlavor porque la cantidad
 * depende del tamaño pero el insumo depende del sabor que se venda.
 */
async function saveSizeRecipe(sizeId: string, recipe?: RecipeInput) {
  if (!recipe) return;

  await prisma.recipeLine.deleteMany({ where: { sizeId } });

  const lines = [];
  if (recipe.cupItemId) {
    lines.push({ sizeId, inventoryItemId: recipe.cupItemId, quantityPerUnit: 1 });
  }
  if (recipe.iceItemId && recipe.ice && recipe.ice > 0) {
    lines.push({ sizeId, inventoryItemId: recipe.iceItemId, quantityPerUnit: recipe.ice });
  }
  if (recipe.pulp && recipe.pulp > 0) {
    lines.push({ sizeId, resolveItemFromFlavor: true, quantityPerUnit: recipe.pulp });
  }

  if (lines.length) await prisma.recipeLine.createMany({ data: lines });
}

export async function updateCatalogLink(
  kind: CatalogKind,
  id: string,
  input: {
    inventoryItemId?: string | null;
    useQuantityPerUnit?: number;
    recipe?: RecipeInput;
    color?: string | null;
  },
): Promise<ActionResult> {
  const session = await requireAdmin();

  const inventoryItemId = input.inventoryItemId || null;
  if (inventoryItemId) {
    const exists = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: { id: true },
    });
    if (!exists) return { ok: false, error: "Ese insumo ya no existe." };
  }

  if (kind === "flavors") {
    await prisma.flavor.update({
      where: { id },
      data: { inventoryItemId, color: cleanColor(input.color) },
    });
  } else if (kind === "addons") {
    await prisma.addon.update({
      where: { id },
      data: {
        inventoryItemId,
        useQuantityPerUnit: Math.max(0, input.useQuantityPerUnit ?? 0),
      },
    });
  } else {
    await saveSizeRecipe(id, input.recipe);
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "receta_actualizada",
      entity: kind === "sizes" ? "Size" : kind === "flavors" ? "Flavor" : "Addon",
      entityId: id,
      newValue: {
        insumo: inventoryItemId,
        consumo: input.useQuantityPerUnit,
        receta: input.recipe ? JSON.stringify(input.recipe) : undefined,
      },
    },
  });

  revalidateCatalog();
  revalidatePath("/admin/inventario");
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

/**
 * Solo se aceptan los colores de la paleta. El valor llega del navegador, así
 * que uno cualquiera podría no leerse sobre el fondo oscuro o confundirse con
 * el color del acento.
 */
function cleanColor(value: string | null | undefined): string | null {
  if (!value) return null;
  return isFlavorColor(value) ? value : null;
}
