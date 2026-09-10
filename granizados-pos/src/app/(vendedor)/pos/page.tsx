import { prisma } from "@/lib/prisma";
import { Configurator, type Favorite } from "./configurator";

// La promo del día todavía no tiene entidad propia en el modelo de datos: se
// define aquí hasta que se decida administrarla desde el panel.
const PROMO: Favorite = {
  sizeId: "m",
  flavorId: "pina",
  addonIds: ["fruta"],
};
const PROMO_DISCOUNT = 1500;

export default async function PosPage({
  searchParams,
}: PageProps<"/pos">) {
  const query = await searchParams;
  const [sizes, flavors, addons, topItems] = await Promise.all([
    prisma.size.findMany({
      where: { visible: true, active: true },
      orderBy: { price: "asc" },
      select: { id: true, name: true, price: true },
    }),
    prisma.flavor.findMany({
      where: { visible: true, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.addon.findMany({
      where: { visible: true, active: true },
      orderBy: { price: "asc" },
      select: { id: true, name: true, price: true },
    }),
    prisma.saleItem.findMany({
      where: { sale: { status: "OK" } },
      select: {
        quantity: true,
        sizeId: true,
        flavorId: true,
        addons: { select: { addonId: true } },
      },
    }),
  ]);

  const visibleSizes = new Set(sizes.map((s) => s.id));
  const visibleFlavors = new Set(flavors.map((f) => f.id));
  const visibleAddons = new Set(addons.map((a) => a.id));

  // "Los más vendidos" sale de ventas reales, nunca de valores en duro.
  const tally = new Map<string, { favorite: Favorite; units: number }>();
  for (const item of topItems) {
    const addonIds = item.addons.map((a) => a.addonId).sort();
    const stillSellable =
      visibleSizes.has(item.sizeId) &&
      visibleFlavors.has(item.flavorId) &&
      addonIds.every((id) => visibleAddons.has(id));
    if (!stillSellable) continue;

    const key = [item.sizeId, item.flavorId, addonIds.join(",")].join("|");
    const current = tally.get(key);
    if (current) {
      current.units += item.quantity;
    } else {
      tally.set(key, {
        favorite: {
          sizeId: item.sizeId,
          flavorId: item.flavorId,
          addonIds,
        },
        units: item.quantity,
      });
    }
  }

  const favorites = [...tally.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 4)
    .map((entry) => entry.favorite);

  // Editar una línea del carrito llega como selección en la URL.
  const pick = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const editSize = pick("tamano");
  const editFlavor = pick("sabor");
  const editAddons = (pick("adiciones") ?? "").split(",").filter(Boolean);
  const initial =
    editSize && editFlavor && visibleSizes.has(editSize) && visibleFlavors.has(editFlavor)
      ? {
          sizeId: editSize,
          flavorId: editFlavor,
          addonIds: editAddons.filter((id) => visibleAddons.has(id)),
        }
      : null;

  const promoSellable =
    visibleSizes.has(PROMO.sizeId) &&
    visibleFlavors.has(PROMO.flavorId) &&
    PROMO.addonIds.every((id) => visibleAddons.has(id));

  return (
    <Configurator
      sizes={sizes}
      flavors={flavors}
      addons={addons}
      favorites={favorites}
      promo={promoSellable ? PROMO : null}
      promoDiscount={PROMO_DISCOUNT}
      initial={initial}
    />
  );
}
