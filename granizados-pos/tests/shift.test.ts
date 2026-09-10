import { describe, expect, it } from "vitest";
import {
  closureDifference,
  emptyTotals,
  sumTotals,
  totalsByMethod,
} from "@/server/shift";

const sale = (
  method: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO",
  total: number,
  status: "OK" | "ANULADA" = "OK",
) => ({ method, total, status });

describe("totales del turno por método", () => {
  it("agrupa cada venta en su método de pago", () => {
    const totals = totalsByMethod([
      sale("EFECTIVO", 12000),
      sale("EFECTIVO", 8000),
      sale("TRANSFERENCIA", 15000),
      sale("TARJETA", 6000),
      sale("OTRO", 3000),
    ]);

    expect(totals.EFECTIVO).toBe(20000);
    expect(totals.TRANSFERENCIA).toBe(15000);
    expect(totals.TARJETA).toBe(6000);
    expect(totals.OTRO).toBe(3000);
    expect(sumTotals(totals)).toBe(44000);
  });

  it("excluye las ventas anuladas: ese dinero no entró", () => {
    const totals = totalsByMethod([
      sale("EFECTIVO", 12000),
      sale("EFECTIVO", 9000, "ANULADA"),
    ]);

    expect(totals.EFECTIVO).toBe(12000);
  });

  it("un turno sin ventas da todo en cero", () => {
    expect(totalsByMethod([])).toEqual(emptyTotals());
    expect(sumTotals(emptyTotals())).toBe(0);
  });
});

describe("diferencia del cierre de caja", () => {
  it("es cero cuando lo contado coincide con lo esperado", () => {
    expect(closureDifference(312000, 312000)).toBe(0);
  });

  it("es positiva cuando sobra dinero", () => {
    expect(closureDifference(314000, 312000)).toBe(2000);
  });

  it("es negativa cuando falta dinero", () => {
    expect(closureDifference(309000, 312000)).toBe(-3000);
  });

  it("solo compara contra el efectivo, no contra el total del turno", () => {
    const totals = totalsByMethod([
      sale("EFECTIVO", 100000),
      sale("TRANSFERENCIA", 250000),
    ]);

    // Contar los 100.000 en efectivo cuadra, aunque el turno vendió 350.000.
    expect(closureDifference(100000, totals.EFECTIVO)).toBe(0);
    expect(sumTotals(totals)).toBe(350000);
  });

  it("descuadra si se cuenta el efectivo de una venta anulada", () => {
    const totals = totalsByMethod([
      sale("EFECTIVO", 20000),
      sale("EFECTIVO", 5000, "ANULADA"),
    ]);

    expect(closureDifference(25000, totals.EFECTIVO)).toBe(5000);
  });
});
