"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/ventas", label: "Ventas" },
  { href: "/admin/productos", label: "Productos y precios" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/caja", label: "Caja" },
  { href: "/admin/finanzas", label: "Finanzas" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/configuracion", label: "Configuración" },
  { href: "/admin/auditoria", label: "Auditoría" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="pos-scroll -mx-4 mb-[6px] flex gap-[6px] overflow-x-auto px-4 pb-[10px]">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="pos-tap flex-none whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[11px] py-[7px] text-[12.5px]"
            style={{
              boxShadow: active
                ? "inset 0 0 0 1px var(--color-accent)"
                : "inset 0 0 0 1px var(--color-divider)",
              color: active ? "var(--color-accent)" : "var(--color-text)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
