import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CatalogSection, type CatalogRow } from "./catalog-section";

export default async function AdminProductosPage() {
  await requireAdmin();

  const [sizes, flavors, addons] = await Promise.all([
    prisma.size.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
    prisma.flavor.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.addon.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
  ]);

  const sizeRows: CatalogRow[] = sizes.map((size) => ({
    id: size.id,
    name: size.name,
    price: size.price,
    visible: size.visible,
  }));
  const flavorRows: CatalogRow[] = flavors.map((flavor) => ({
    id: flavor.id,
    name: flavor.name,
    price: null,
    visible: flavor.visible,
  }));
  const addonRows: CatalogRow[] = addons.map((addon) => ({
    id: addon.id,
    name: addon.name,
    price: addon.price,
    cost: addon.cost,
    visible: addon.visible,
  }));

  return (
    <div className="flex flex-col gap-[18px]">
      <CatalogSection
        kind="sizes"
        title="Tamaños y precios"
        addLabel="Nuevo tamaño"
        namePlaceholder="Ej. Jumbo"
        hasPrice
        rows={sizeRows}
      />
      <CatalogSection
        kind="flavors"
        title="Sabores"
        addLabel="Nuevo sabor"
        namePlaceholder="Ej. Coco"
        rows={flavorRows}
      />
      <CatalogSection
        kind="addons"
        title="Adiciones"
        addLabel="Nueva adición"
        namePlaceholder="Ej. Chocolate"
        hasPrice
        hasCost
        rows={addonRows}
      />
      <p className="text-[11.5px] text-[var(--color-neutral-400)]">
        Lo que ocultes aquí desaparece de la pantalla del vendedor de inmediato.
      </p>
    </div>
  );
}
