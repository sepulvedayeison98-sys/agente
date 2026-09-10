import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatCOP } from "@/lib/money";
import { isPeriodId, resolvePeriod } from "@/server/periods";
import { financeSummary } from "@/server/finance";
import { ExpenseForm } from "./expense-form";

export default async function AdminFinanzasPage({
  searchParams,
}: PageProps<"/admin/finanzas">) {
  await requireAdmin();

  const query = await searchParams;
  const raw = Array.isArray(query.periodo) ? query.periodo[0] : query.periodo;
  const period = isPeriodId(raw) ? raw : "hoy";
  const range = resolvePeriod(period);

  const [summary, expenses, categories] = await Promise.all([
    financeSummary(range),
    prisma.expense.findMany({
      where: { date: { gte: range.from, lte: range.to } },
      orderBy: { date: "desc" },
      include: { category: { select: { name: true } } },
    }),
    prisma.expenseCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = [
    { label: "Ventas totales", value: formatCOP(summary.revenue) },
    { label: "Efectivo", value: formatCOP(summary.byMethod.EFECTIVO) },
    { label: "Transferencias", value: formatCOP(summary.byMethod.TRANSFERENCIA) },
    { label: "Tarjetas", value: formatCOP(summary.byMethod.TARJETA) },
    { label: "Costo de productos", value: "− " + formatCOP(summary.productCost) },
    { label: "Gastos", value: "− " + formatCOP(summary.expenses) },
  ];

  return (
    <div>
      <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between py-[5px] text-[13px]"
          >
            <span className="text-[var(--color-neutral-400)]">{row.label}</span>
            <span className="font-[family-name:var(--font-heading)]">
              {row.value}
            </span>
          </div>
        ))}
        <div className="my-2 h-px bg-[var(--color-divider)]" />
        <div className="flex items-baseline justify-between">
          <span className="text-[13px]">Utilidad estimada</span>
          <span className="font-[family-name:var(--font-heading)] text-[22px] text-[var(--color-accent-300)]">
            {formatCOP(summary.profit)}
          </span>
        </div>
      </div>

      <h2 className="mb-[6px] mt-4 text-[12px] font-medium text-[var(--color-neutral-400)]">
        Gastos del período
      </h2>

      <ExpenseForm
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
      />

      {expenses.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-[var(--color-neutral-400)]">
          No hay gastos registrados en este período.
        </p>
      ) : (
        <table className="mt-2 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-divider)] text-[11px] uppercase tracking-[0.06em] text-[var(--color-neutral-400)]">
              <th className="py-2 font-normal">Concepto</th>
              <th className="py-2 font-normal">Categoría</th>
              <th className="py-2 text-right font-normal">Valor</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b border-[var(--color-divider)]"
              >
                <td className="py-[9px] text-[13px]">{expense.concept}</td>
                <td className="py-[9px] text-[12px] text-[var(--color-neutral-400)]">
                  {expense.category.name}
                </td>
                <td className="py-[9px] text-right font-[family-name:var(--font-heading)] text-[13px]">
                  {formatCOP(expense.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
