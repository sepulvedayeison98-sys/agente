import { prisma } from "@/lib/prisma";
import { formatCOP } from "@/lib/money";

export default async function PosPage() {
  const [sizes, flavors, addons] = await Promise.all([
    prisma.size.findMany({
      where: { visible: true, active: true },
      orderBy: { price: "asc" },
    }),
    prisma.flavor.findMany({
      where: { visible: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.addon.findMany({
      where: { visible: true, active: true },
      orderBy: { price: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-[14px]">
      <section>
        <h2 className="mb-2 text-[12px] font-medium text-[var(--color-neutral-400)]">
          Armar granizado
        </h2>
        <div className="grid grid-cols-4 gap-[6px]">
          {sizes.map((size) => (
            <div
              key={size.id}
              className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-1 py-[9px] text-center shadow-[inset_0_0_0_1px_var(--color-divider)]"
            >
              <div className="text-[11.5px]">{size.name}</div>
              <div className="mt-[2px] font-[family-name:var(--font-heading)] text-[13.5px]">
                {formatCOP(size.price)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-[6px]">
          {flavors.map((flavor) => (
            <div
              key={flavor.id}
              className="grid h-[50px] place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[13px] shadow-[inset_0_0_0_1px_var(--color-divider)]"
            >
              {flavor.name}
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-[6px]">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className="flex items-center gap-[6px] rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[11px] py-2 text-[12.5px] shadow-[inset_0_0_0_1px_var(--color-divider)]"
            >
              {addon.name}
              <span className="text-[11px] text-[var(--color-neutral-400)]">
                +{formatCOP(addon.price)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[11.5px] text-[var(--color-neutral-400)]">
        H1 listo: catálogo leído de la base de datos, solo con lo visible para el
        vendedor. El configurador, carrito y cobro llegan en H2.
      </p>
    </div>
  );
}
