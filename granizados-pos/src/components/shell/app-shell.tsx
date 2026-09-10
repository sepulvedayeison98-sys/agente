import type { ReactNode } from "react";
import { BottomNav, type NavItem } from "./bottom-nav";

type AppShellProps = {
  title: string;
  subtitle: string;
  nav: NavItem[];
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
};

export function AppShell({
  title,
  subtitle,
  nav,
  children,
  footer,
  headerAction,
}: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
      <header className="flex items-center gap-[10px] px-4 pb-[10px] pt-[6px]">
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

      <main className="flex-1 overflow-auto px-4 pb-3">{children}</main>

      {footer ? <div className="mx-4 mb-2">{footer}</div> : null}

      <BottomNav items={nav} />
    </div>
  );
}
