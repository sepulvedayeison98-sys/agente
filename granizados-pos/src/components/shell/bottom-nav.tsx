"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <nav className="flex gap-[2px] border-t border-[var(--color-divider)] px-2 pb-[34px] pt-[6px]">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="pos-tap flex flex-1 flex-col items-center gap-[3px] rounded-[var(--radius-md)] py-[6px]"
            style={{
              color: active
                ? "var(--color-accent)"
                : "var(--color-neutral-500)",
            }}
          >
            <Icon size={20} weight={active ? "fill" : "regular"} />
            <span className="text-[10px] tracking-[0.01em]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
