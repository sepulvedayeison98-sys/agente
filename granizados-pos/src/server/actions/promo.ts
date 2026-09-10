"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type PromoInput = {
  name: string;
  sizeId: string;
  flavorId: string;
  addonIds: string[];
  discount: number;
};

function revalidatePromo() {
  revalidatePath("/admin/promos");
  revalidatePath("/pos");
}

async function validate(input: PromoInput): Promise<string | null> {
  if (!input.name.trim()) return "Escribe el nombre de la promo.";
  if (!Number.isFinite(input.discount) || input.discount < 0) {
    return "El descuento no es válido.";
  }

  const [size, flavor] = await Promise.all([
    prisma.size.findUnique({ where: { id: input.sizeId } }),
    prisma.flavor.findUnique({ where: { id: input.flavorId } }),
  ]);
  if (!size) return "Elige un tamaño válido.";
  if (!flavor) return "Elige un sabor válido.";

  const base =
    size.price +
    (await prisma.addon.findMany({ where: { id: { in: input.addonIds } } })).reduce(
      (total, addon) => total + addon.price,
      0,
    );
  if (input.discount > base) {
    return "El descuento no puede superar el precio de la combinación.";
  }

  return null;
}

export async function createPromo(input: PromoInput): Promise<ActionResult> {
  const session = await requireAdmin();

  const error = await validate(input);
  if (error) return { ok: false, error };

  const promo = await prisma.promo.create({
    data: {
      name: input.name.trim(),
      sizeId: input.sizeId,
      flavorId: input.flavorId,
      discount: Math.round(input.discount),
      addons: {
        create: input.addonIds.map((addonId) => ({ addonId })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "promo_creada",
      entity: "Promo",
      entityId: promo.id,
      newValue: { nombre: promo.name, descuento: promo.discount },
    },
  });

  revalidatePromo();
  return { ok: true };
}

export async function updatePromo(
  id: string,
  input: PromoInput,
): Promise<ActionResult> {
  const session = await requireAdmin();

  const error = await validate(input);
  if (error) return { ok: false, error };

  const current = await prisma.promo.findUnique({ where: { id } });
  if (!current) return { ok: false, error: "La promo ya no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.promoAddon.deleteMany({ where: { promoId: id } });
    await tx.promo.update({
      where: { id },
      data: {
        name: input.name.trim(),
        sizeId: input.sizeId,
        flavorId: input.flavorId,
        discount: Math.round(input.discount),
        addons: {
          create: input.addonIds.map((addonId) => ({ addonId })),
        },
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "promo_editada",
      entity: "Promo",
      entityId: id,
      oldValue: { nombre: current.name, descuento: current.discount },
      newValue: { nombre: input.name.trim(), descuento: Math.round(input.discount) },
    },
  });

  revalidatePromo();
  return { ok: true };
}

export async function togglePromo(id: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const current = await prisma.promo.findUnique({ where: { id } });
  if (!current) return { ok: false, error: "La promo ya no existe." };

  await prisma.promo.update({
    where: { id },
    data: { active: !current.active },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "promo_visibilidad",
      entity: "Promo",
      entityId: id,
      oldValue: { activa: current.active },
      newValue: { activa: !current.active, nombre: current.name },
    },
  });

  revalidatePromo();
  return { ok: true };
}

export async function deletePromo(id: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const current = await prisma.promo.findUnique({ where: { id } });
  if (!current) return { ok: false, error: "La promo ya no existe." };

  await prisma.promo.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "promo_eliminada",
      entity: "Promo",
      entityId: id,
      oldValue: { nombre: current.name, descuento: current.discount },
    },
  });

  revalidatePromo();
  return { ok: true };
}
