import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PromoManager, type PromoRow } from "./promo-manager";

export default async function AdminPromosPage() {
  await requireAdmin();

  const [promos, sizes, flavors, addons] = await Promise.all([
    prisma.promo.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        size: { select: { name: true, price: true, visible: true } },
        flavor: { select: { name: true, visible: true } },
        addons: {
          include: { addon: { select: { id: true, name: true, price: true, visible: true } } },
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
      // Si algo de la combinación está oculto, la promo no se puede mostrar.
      hiddenPart:
        !promo.size.visible ||
        !promo.flavor.visible ||
        promo.addons.some((entry) => !entry.addon.visible),
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
