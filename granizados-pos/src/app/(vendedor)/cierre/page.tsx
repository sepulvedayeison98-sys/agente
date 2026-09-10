import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { shiftSales, shiftStart, sumTotals, totalsByMethod } from "@/server/shift";
import { ClosureForm } from "./closure-form";
import { ClosedState } from "./closed-state";

export default async function CierrePage() {
  const session = await verifySession();

  const from = await shiftStart(session.userId);
  const sales = await shiftSales(session.userId, from);
  const totals = totalsByMethod(sales);
  const ok = sales.filter((sale) => sale.status === "OK");

  // Sin ventas después del último cierre, la caja sigue cerrada.
  if (sales.length === 0) {
    const lastClosure = await prisma.cashClosure.findFirst({
      where: { userId: session.userId },
      orderBy: { closedAt: "desc" },
    });

    if (lastClosure) {
      return (
        <ClosedState
          shift={lastClosure.shift}
          time={lastClosure.closedAt.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
          difference={lastClosure.difference}
        />
      );
    }
  }

  return (
    <ClosureForm
      rows={[
        { label: "Total de ventas", value: sumTotals(totals) },
        { label: "Cantidad de ventas", value: ok.length, plain: true },
        { label: "Efectivo", value: totals.EFECTIVO },
        { label: "Transferencias", value: totals.TRANSFERENCIA },
        { label: "Tarjetas", value: totals.TARJETA },
        { label: "Otros pagos", value: totals.OTRO },
      ]}
      expectedCash={totals.EFECTIVO}
    />
  );
}
