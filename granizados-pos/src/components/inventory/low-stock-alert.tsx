import { Warning } from "@phosphor-icons/react/dist/ssr";

export type LowStockItem = {
  name: string;
  quantity: number;
  unit: string;
};

export function LowStockAlert({ items }: { items: LowStockItem[] }) {
  if (!items.length) return null;

  return (
    <div
      className="flex items-start gap-[9px] rounded-[var(--radius-md)] px-3 py-[10px]"
      style={{
        background: "var(--color-accent-900)",
        boxShadow: "inset 0 0 0 1px var(--color-accent-700)",
      }}
    >
      <Warning size={16} weight="fill" className="mt-px text-[var(--color-accent-300)]" />
      <div className="text-[12px]">
        Inventario bajo
        <div className="text-[11.5px] text-[var(--color-neutral-400)]">
          {items
            .map((item) => `${item.name} (${item.quantity} ${item.unit})`)
            .join(" · ")}
        </div>
      </div>
    </div>
  );
}
