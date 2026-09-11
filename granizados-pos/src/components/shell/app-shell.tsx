import type { ReactNode } from "react";
import Image from "next/image";
import { BottomNav, type NavItem } from "./bottom-nav";

type AppShellProps = {
  title: string;
  subtitle: string;
  nav: NavItem[];
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
  /** El fondo con los neones y el logo de marca de agua. */
  ambient?: boolean;
  /** Las tarjetas de cristal. Van aparte del fondo porque el panel del
      administrador lleva el fondo pero conserva sus tarjetas planas: ahí se
      leen cifras y tablas, y el cristal resta contraste donde hace falta. */
  glass?: boolean;
};

export function AppShell({
  title,
  subtitle,
  nav,
  children,
  footer,
  headerAction,
  ambient = false,
  glass = false,
}: AppShellProps) {
  return (
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-[430px] flex-col${glass ? " oasis-glass" : ""}`}
    >
      {ambient ? <div aria-hidden className="oasis-ambient" /> : null}
      <header className="flex items-center gap-[9px] px-4 pb-[10px] pt-[6px]">
        <Image
          src="/logo-oasis-sm.png"
          alt=""
          width={132}
          height={98}
          priority
          className="h-[30px] w-auto flex-none"
        />
        <div className="min-w-0 flex-1">
          <div className="font-[family-name:var(--font-heading)] text-[17px] font-medium tracking-[-0.015em]">
            {title}
          </div>
          <div className="truncate text-[11px] text-[var(--color-neutral-400)]">
            {subtitle}
          </div>
        </div>
        {headerAction}
      </header>

      {/* Columna flex para que una pantalla pueda anclar su acción principal al
          pie con mt-auto en vez de dejarla donde termine el contenido. */}
      <main className="flex flex-1 flex-col overflow-auto px-4 pb-3">
        {children}
      </main>

      {footer ? <div className="mx-4 mb-2">{footer}</div> : null}

      <BottomNav items={nav} />
    </div>
  );
}
