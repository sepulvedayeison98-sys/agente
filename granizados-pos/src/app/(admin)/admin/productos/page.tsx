import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CatalogSection, type CatalogRow } from "./catalog-section";

export default async function AdminProductosPage() {
  await requireAdmin();

  const [sizes, flavors, addons, items] = await Promise.all([
    prisma.size.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
      include: { recipeLines: true },
    }),
    prisma.flavor.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.addon.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
    prisma.inventoryItem.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const inventory = items.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
  }));

  const sizeRows: CatalogRow[] = sizes.map((size) => {
    const pulp = size.recipeLines.find((line) => line.resolveItemFromFlavor);
    // El vaso se gasta de a uno; el hielo lleva cantidad por tamaño.
    const fixed = size.recipeLines.filter((line) => !line.resolveItemFromFlavor);
    const cup = fixed.find((line) => line.quantityPerUnit === 1);
    const ice = fixed.find((line) => line !== cup);

    return {
      id: size.id,
      name: size.name,
      price: size.price,
      visible: size.visible,
      recipe: {
        cupItemId: cup?.inventoryItemId ?? null,
        iceItemId: ice?.inventoryItemId ?? null,
        ice: ice?.quantityPerUnit ?? 0,
        pulp: pulp?.quantityPerUnit ?? 0,
      },
    };
  });

  const flavorRows: CatalogRow[] = flavors.map((flavor) => ({
    id: flavor.id,
    name: flavor.name,
    price: null,
    visible: flavor.visible,
    inventoryItemId: flavor.inventoryItemId,
    color: flavor.color,
  }));

  const addonRows: CatalogRow[] = addons.map((addon) => ({
    id: addon.id,
    name: addon.name,
    price: addon.price,
    cost: addon.cost,
    visible: addon.visible,
    inventoryItemId: addon.inventoryItemId,
    useQuantityPerUnit: addon.useQuantityPerUnit,
    isLiquor: addon.isLiquor,
  }));

  return (
    <div className="flex flex-col gap-[18px]">
      <CatalogSection
        kind="sizes"
        title="Tamaños y precios"
        addLabel="Nuevo tamaño"
        namePlaceholder="Ej. Jumbo"
        hasPrice
        hasRecipe
        rows={sizeRows}
        inventory={inventory}
      />
      <CatalogSection
        kind="flavors"
        title="Sabores"
        addLabel="Nuevo sabor"
        namePlaceholder="Ej. Coco"
        hasColor
        hasInsumo
        rows={flavorRows}
        inventory={inventory}
      />
      <CatalogSection
        kind="addons"
        title="Adiciones"
        addLabel="Nueva adición"
        namePlaceholder="Ej. Chocolate"
        hasPrice
        hasCost
        hasInsumo
        hasConsumo
        hasLiquor
        rows={addonRows}
        inventory={inventory}
      />
      <p className="text-[11.5px] text-[var(--color-neutral-400)]">
        Lo que ocultes aquí desaparece de la pantalla del vendedor de inmediato.
        Lo que no tenga insumo asociado se vende sin descontar inventario.
      </p>
    </div>
  );
}
