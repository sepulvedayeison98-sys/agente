import Link from "next/link";
import { ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Solo el administrador ve este botón: un vendedor no tiene panel al que ir.
 */
export function RoleSwitch({ to }: { to: "pos" | "admin" }) {
  const isToPos = to === "pos";

  return (
    <Link
      href={isToPos ? "/pos" : "/admin/dashboard"}
      className="pos-tap flex flex-none items-center gap-[6px] rounded-[var(--radius-md)] border border-[var(--color-divider)] px-[10px] py-[5px] text-[11px]"
    >
      <ArrowsLeftRight size={13} className="text-[var(--color-accent)]" />
      {isToPos ? "Vender" : "Panel"}
    </Link>
  );
}
