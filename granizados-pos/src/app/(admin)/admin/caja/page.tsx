import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatCOP, formatSignedCOP } from "@/lib/money";
import { formatFechaHora } from "@/lib/dia";

export default async function AdminCajaPage() {
  await requireAdmin();

  const closures = await prisma.cashClosure.findMany({
    orderBy: { closedAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });

  if (closures.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-[var(--color-neutral-400)]">
        Todavía no hay cierres de caja registrados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {closures.map((closure) => {
        const expected = closure.counted - closure.difference;
        return (
          <div
            key={closure.id}
            className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[11px] shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-heading)] text-[13.5px]">
                {closure.shift}
              </span>
              <span className="text-[11px] text-[var(--color-neutral-400)]">
                {formatFechaHora(closure.closedAt)}
              </span>
              <span
                className="ml-auto font-[family-name:var(--font-heading)] text-[14px]"
                style={{
                  color:
                    closure.difference === 0
                      ? "var(--color-accent-300)"
                      : "var(--color-neutral-300)",
                }}
              >
                {formatSignedCOP(closure.difference)}
              </span>
            </div>
            <div className="mt-[3px] text-[11.5px] text-[var(--color-neutral-400)]">
              Esperado {formatCOP(expected)} · contado{" "}
              {formatCOP(closure.counted)} · {closure.user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
