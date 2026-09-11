"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/vendedor/use-cart";
import {
  ChartLineUp,
  ChartPieSlice,
  LockSimple,
  Package,
  Receipt,
  ShoppingCartSimple,
  Storefront,
} from "@phosphor-icons/react";

const ICONS = {
  storefront: Storefront,
  cart: ShoppingCartSimple,
  receipt: Receipt,
  lock: LockSimple,
  dashboard: ChartPieSlice,
  package: Package,
  reports: ChartLineUp,
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { lines, hydrated } = useCart();
  // El vendedor tenía que entrar al carrito para saber cuántos llevaba.
  const inCart = lines.reduce((total, line) => total + line.quantity, 0);

  return (
    <nav className="oasis-nav flex gap-[2px] border-t border-[var(--color-divider)] px-2 pb-[34px] pt-[6px]">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active}
            className="pos-tap flex flex-1 flex-col items-center gap-[3px] rounded-[var(--radius-md)] py-[6px]"
            style={{
              color: active
                ? "var(--color-accent)"
                : "var(--color-neutral-500)",
            }}
          >
            <span className="relative">
              <Icon size={20} weight={active ? "fill" : "regular"} />
              {item.icon === "cart" && hydrated && inCart > 0 ? (
                <span
                  key={inCart}
                  className="animate-pop-in absolute -right-[9px] -top-[5px] grid h-[16px] min-w-[16px] place-items-center rounded-full px-[4px] font-[family-name:var(--font-heading)] text-[10px] font-semibold tabular-nums"
                  style={{
                    background: "var(--color-accent)",
                    color: "var(--color-bg)",
                  }}
                >
                  {inCart > 99 ? "99+" : inCart}
                </span>
              ) : null}
            </span>
            <span className="text-[10px] tracking-[0.01em]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
