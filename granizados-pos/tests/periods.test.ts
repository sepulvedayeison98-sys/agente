import { describe, expect, it } from "vitest";
import { isPeriodId, resolvePeriod } from "@/server/periods";
import { diaDeLaSemana, partesEnZona } from "@/lib/dia";

// Jueves 10 de septiembre de 2026, 3:30 p.m. en Medellín.
const NOW = new Date("2026-09-10T20:30:00Z");

/**
 * Los rangos se leen con el reloj de Medellín, que es donde está el negocio.
 * Leerlos con el del proceso —UTC en las pruebas, igual que en Vercel— era
 * justo lo que tapaba el desfase de cinco horas.
 */
const iso = (date: Date) => {
  const { year, month, day, hour, minute } = partesEnZona(date);
  const dosDigitos = (valor: number) => String(valor).padStart(2, "0");
  return `${year}-${dosDigitos(month)}-${dosDigitos(day)} ${dosDigitos(hour)}:${dosDigitos(minute)}`;
};

describe("rangos de período", () => {
  it("hoy va de medianoche al final del día", () => {
    const { from, to } = resolvePeriod("hoy", undefined, NOW);
    expect(iso(from)).toBe("2026-09-10 00:00");
    expect(iso(to)).toBe("2026-09-10 23:59");
  });

  it("ayer cubre el día anterior completo", () => {
    const { from, to } = resolvePeriod("ayer", undefined, NOW);
    expect(iso(from)).toBe("2026-09-09 00:00");
    expect(iso(to)).toBe("2026-09-09 23:59");
  });

  it("la semana arranca el lunes", () => {
    const { from } = resolvePeriod("semana", undefined, NOW);
    expect(iso(from)).toBe("2026-09-07 00:00");
    expect(diaDeLaSemana(from)).toBe(0);
  });

  it("un lunes la semana arranca ese mismo día", () => {
    const monday = new Date("2026-09-07T14:00:00Z");
    const { from } = resolvePeriod("semana", undefined, monday);
    expect(iso(from)).toBe("2026-09-07 00:00");
  });

  it("un domingo sigue perteneciendo a la semana que arrancó el lunes", () => {
    const sunday = new Date("2026-09-14T01:00:00Z");
    const { from } = resolvePeriod("semana", undefined, sunday);
    expect(iso(from)).toBe("2026-09-07 00:00");
  });

  it("el mes arranca el día 1", () => {
    const { from } = resolvePeriod("mes", undefined, NOW);
    expect(iso(from)).toBe("2026-09-01 00:00");
  });

  it("el personalizado respeta las fechas dadas", () => {
    const { from, to } = resolvePeriod(
      "personalizado",
      { from: "2026-08-01", to: "2026-08-31" },
      NOW,
    );
    expect(iso(from)).toBe("2026-08-01 00:00");
    expect(iso(to)).toBe("2026-08-31 23:59");
  });

  it("una fecha inválida cae en el día de hoy en vez de romper", () => {
    const { from } = resolvePeriod(
      "personalizado",
      { from: "no-es-fecha" },
      NOW,
    );
    expect(iso(from)).toBe("2026-09-10 00:00");
  });

  it("reconoce solo los períodos válidos", () => {
    expect(isPeriodId("hoy")).toBe(true);
    expect(isPeriodId("mes")).toBe(true);
    expect(isPeriodId("cualquiera")).toBe(false);
    expect(isPeriodId(undefined)).toBe(false);
  });
});
