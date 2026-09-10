import { requireAdmin } from "@/lib/dal";
import { AppShell } from "@/components/shell/app-shell";
import { AdminTabs } from "@/components/shell/admin-tabs";
import { RoleSwitch } from "@/components/shell/role-switch";
import type { NavItem } from "@/components/shell/bottom-nav";

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Panel", icon: "dashboard" },
  { href: "/admin/ventas", label: "Ventas", icon: "receipt" },
  { href: "/admin/inventario", label: "Inventario", icon: "package" },
  { href: "/admin/reportes", label: "Reportes", icon: "reports" },
];

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const session = await requireAdmin();

  return (
    <AppShell
      title="Granizados Oasis"
      subtitle={`Administrador · ${session.name}`}
      nav={NAV}
      headerAction={<RoleSwitch to="pos" />}
    >
      <AdminTabs />
      {children}
    </AppShell>
  );
}
