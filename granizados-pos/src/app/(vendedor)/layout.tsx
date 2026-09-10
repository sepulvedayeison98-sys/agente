import { verifySession } from "@/lib/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/bottom-nav";
import { ToastProvider } from "@/components/vendedor/toast";
import { RoleSwitch } from "@/components/shell/role-switch";

const NAV: NavItem[] = [
  { href: "/pos", label: "Nueva venta", icon: "storefront" },
  { href: "/carrito", label: "Carrito", icon: "cart" },
  { href: "/mis-ventas", label: "Mis ventas", icon: "receipt" },
  { href: "/cierre", label: "Cierre", icon: "lock" },
];

export default async function VendedorLayout({ children }: LayoutProps<"/">) {
  const session = await verifySession();

  return (
    <ToastProvider>
      <AppShell
        title="Granizados Oasis"
        subtitle={`${session.name} · ${
          session.role === "ADMINISTRADOR" ? "administrador" : "vendedor"
        }`}
        nav={NAV}
        headerAction={
          session.role === "ADMINISTRADOR" ? <RoleSwitch to="admin" /> : null
        }
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
