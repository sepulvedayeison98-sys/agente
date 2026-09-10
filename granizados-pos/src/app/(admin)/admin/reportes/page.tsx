import { requireAdmin } from "@/lib/dal";
import { formatCOP } from "@/lib/money";
import { isPeriodId, resolvePeriod } from "@/server/periods";
import { rankings, type RankingRow } from "@/server/finance";

export default async function AdminReportesPage({
  searchParams,
}: PageProps<"/admin/reportes">) {
  await requireAdmin();

  const query = await searchParams;
  const raw = Array.isArray(query.periodo) ? query.periodo[0] : query.periodo;
  const period = isPeriodId(raw) ? raw : "hoy";

  const report = await rankings(resolvePeriod(period));

  const blocks: { title: string; rows: RankingRow[]; money?: boolean }[] = [
    { title: "Sabores más vendidos", rows: report.flavors },
    { title: "Tamaños más vendidos", rows: report.sizes },
    { title: "Adiciones más vendidas", rows: report.addons },
    { title: "Métodos de pago", rows: report.methods, money: true },
    { title: "Ventas por empleado", rows: report.sellers, money: true },
    { title: "Horarios de mayor venta", rows: report.hours, money: true },
  ];

  const hasData = blocks.some((block) => block.rows.length > 0);

  if (!hasData) {
    return (
      <p className="py-10 text-center text-[13px] text-[var(--color-neutral-400)]">
        Todavía no hay ventas en este período para reportar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block) => (
        <section key={block.title}>
          <h2 className="mb-2 text-[12px] font-medium text-[var(--color-neutral-400)]">
            {block.title}
          </h2>
          {block.rows.length === 0 ? (
            <p className="text-[12px] text-[var(--color-neutral-400)]">
              Sin datos en este período.
            </p>
          ) : (
            <RankingBars rows={block.rows} money={block.money} />
          )}
        </section>
      ))}
    </div>
  );
}

function RankingBars({
  rows,
  money = false,
}: {
  rows: RankingRow[];
  money?: boolean;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="flex flex-col gap-[7px]">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-[12.5px]">
            <span>{row.label}</span>
            <span className="text-[var(--color-neutral-400)]">
              {money ? formatCOP(row.value) : `${row.value} und`}
            </span>
          </div>
          <div className="h-[5px] rounded-[3px] bg-[var(--color-neutral-900)]">
            <div
              className="h-[5px] rounded-[3px] bg-[var(--color-accent)]"
              style={{ width: `${Math.round((row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
