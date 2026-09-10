import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PromoManager, type PromoRow } from "./promo-manager";

export default async function AdminPromosPage() {
  await requireAdmin();

  const [promos, sizes, flavors, addons] = await Promise.all([
    prisma.promo.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        size: { select: { name: true, price: true, visible: true, active: true } },
        flavor: { select: { name: true, visible: true, active: true } },
        addons: {
          include: {
            addon: {
              select: { id: true, name: true, price: true, visible: true, active: true },
            },
          },
        },
      },
    }),
    prisma.size.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
    prisma.flavor.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.addon.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
  ]);

  const rows: PromoRow[] = promos.map((promo) => {
    const addonPrice = promo.addons.reduce(
      (total, entry) => total + entry.addon.price,
      0,
    );
    const basePrice = promo.size.price + addonPrice;
    return {
      id: promo.id,
      name: promo.name,
      sizeId: promo.sizeId,
      flavorId: promo.flavorId,
      addonIds: promo.addons.map((entry) => entry.addonId),
      discount: promo.discount,
      active: promo.active,
      basePrice,
      // Qué le impide salir, con nombre y motivo. Antes solo se miraba
      // `visible`, así que un tamaño o un sabor eliminado dejaba la promo fuera
      // del POS mientras el panel decía que todo estaba bien.
      missing: [
        ...describeMissing(SIZE, promo.size.name, promo.size),
        ...describeMissing(FLAVOR, promo.flavor.name, promo.flavor),
        ...promo.addons.flatMap((entry) =>
          describeMissing(ADDON, entry.addon.name, entry.addon),
        ),
      ],
    };
  });

  return (
    <PromoManager
      promos={rows}
      sizes={sizes.map((s) => ({ id: s.id, name: s.name, price: s.price }))}
      flavors={flavors.map((f) => ({ id: f.id, name: f.name }))}
      addons={addons.map((a) => ({ id: a.id, name: a.name, price: a.price }))}
    />
  );
}

/** El género va con la palabra: "el sabor Piña", pero "la adición Crema". */
type Kind = { article: string; noun: string; gone: string; hidden: string };

const SIZE: Kind = { article: "el", noun: "tamaño", gone: "eliminado", hidden: "oculto" };
const FLAVOR: Kind = { article: "el", noun: "sabor", gone: "eliminado", hidden: "oculto" };
const ADDON: Kind = { article: "la", noun: "adición", gone: "eliminada", hidden: "oculta" };

function describeMissing(
  kind: Kind,
  name: string,
  part: { visible: boolean; active: boolean },
): string[] {
  const subject = `${kind.article} ${kind.noun} ${name}`;
  if (!part.active) return [`${subject} fue ${kind.gone}`];
  if (!part.visible) return [`${subject} está ${kind.hidden} para el vendedor`];
  return [];
}
