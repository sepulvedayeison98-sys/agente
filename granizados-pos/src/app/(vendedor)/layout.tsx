import { verifySession } from "@/lib/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/bottom-nav";
import { ToastProvider } from "@/components/vendedor/toast";

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
        subtitle={`${session.name} · vendedor`}
        nav={NAV}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
