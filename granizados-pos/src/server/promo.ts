import "server-only";
import { prisma } from "@/lib/prisma";

export type ActivePromo = {
  id: string;
  name: string;
  sizeId: string;
  flavorId: string;
  addonIds: string[];
  discount: number;
};

/**
 * La promo del día que ve el vendedor: la activa más reciente, y solo si su
 * combinación sigue visible en el catálogo. Si el administrador oculta el
 * sabor de la promo, la tarjeta desaparece en vez de ofrecer algo que no se
 * puede vender.
 */
export async function activePromo(): Promise<ActivePromo | null> {
  const promo = await prisma.promo.findFirst({
    where: {
      active: true,
      size: { visible: true, active: true },
      flavor: { visible: true, active: true },
    },
    orderBy: { updatedAt: "desc" },
    include: { addons: { include: { addon: true } } },
  });

  if (!promo) return null;
  if (promo.addons.some((entry) => !entry.addon.visible || !entry.addon.active)) {
    return null;
  }

  return {
    id: promo.id,
    name: promo.name,
    sizeId: promo.sizeId,
    flavorId: promo.flavorId,
    addonIds: promo.addons.map((entry) => entry.addonId),
    discount: promo.discount,
  };
}

export function describePromo(
  sizeName: string,
  flavorName: string,
  addonNames: string[],
): string {
  const base = `${flavorName} ${sizeName.toLowerCase()}`;
  return addonNames.length
    ? `${base} + ${addonNames.map((name) => name.toLowerCase()).join(" + ")}`
    : base;
}
