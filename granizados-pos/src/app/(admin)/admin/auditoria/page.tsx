import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  solicitud_anulacion: "Solicitud de anulación",
  anular_venta: "Venta anulada",
  cierre_caja: "Cierre de caja",
  ajuste_inventario: "Ajuste de inventario",
  cambio_precio: "Cambio de precio",
};

function describe(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return String(value);
  return Object.entries(value as Record<string, unknown>)
    .map(([key, val]) => `${key}: ${val}`)
    .join(" · ");
}

export default async function AdminAuditoriaPage() {
  await requireAdmin();

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11.5px] text-[var(--color-neutral-400)]">
        Cada cambio de precio, ajuste de inventario y anulación queda registrado
        con usuario, fecha y valor anterior.
      </p>

      {entries.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[var(--color-neutral-400)]">
          Todavía no hay movimientos registrados.
        </p>
      ) : null}

      {entries.map((entry) => {
        const before = describe(entry.oldValue);
        const after = describe(entry.newValue);
        return (
          <div
            key={entry.id}
            className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[10px] shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-heading)] text-[13px]">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="ml-auto text-[11px] text-[var(--color-neutral-400)]">
                {entry.createdAt.toLocaleString("es-CO", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
            <div className="mt-[3px] text-[11.5px] text-[var(--color-neutral-400)]">
              {entry.user.name} · {entry.entity}
            </div>
            {before ? (
              <div className="mt-[4px] text-[11px] text-[var(--color-neutral-400)]">
                Antes — {before}
              </div>
            ) : null}
            {after ? (
              <div className="text-[11px] text-[var(--color-accent-300)]">
                Después — {after}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
