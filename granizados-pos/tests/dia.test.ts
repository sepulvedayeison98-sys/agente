import { describe, expect, it } from "vitest";
import {
  diaDeLaSemana,
  fechaDelFormulario,
  finDelDia,
  formatFechaHora,
  formatHora,
  horaDelDia,
  inicioDelDia,
  inicioDelMes,
  sumarDias,
} from "@/lib/dia";
import { resolvePeriod } from "@/server/periods";

/**
 * Estas pruebas corren con TZ=UTC (ver vitest.config.ts), que es la zona del
 * servidor en Vercel. Es justo el escenario donde el panel se vaciaba a las 7
 * de la noche hora de Medellín.
 */

// 2026-09-11 00:30 UTC es el 10 de septiembre, 7:30 p.m., en Medellín.
const NOCHE = new Date("2026-09-11T00:30:00Z");
// Una venta de las 6 p.m. de ese mismo 10 de septiembre en Medellín.
const VENTA = new Date("2026-09-10T23:00:00Z");

describe("el día se cuenta con el reloj de Medellín", () => {
  it("a las 7:30 p.m. todavía es el mismo día, no el siguiente", () => {
    expect(inicioDelDia(NOCHE).toISOString()).toBe("2026-09-10T05:00:00.000Z");
    expect(finDelDia(NOCHE).toISOString()).toBe("2026-09-11T04:59:59.999Z");
  });

  it("una venta de las 6 p.m. cae dentro de ese día", () => {
    expect(VENTA >= inicioDelDia(NOCHE)).toBe(true);
    expect(VENTA <= finDelDia(NOCHE)).toBe(true);
  });

  it("la hora que se muestra es la del reloj de Medellín", () => {
    expect(horaDelDia(VENTA)).toBe(18);
    expect(formatHora(VENTA)).toBe("18:00");
    // El día 10, no el 11, y las 18:00, no las 23:00 de UTC.
    expect(formatFechaHora(VENTA)).toMatch(/^10\/0?9, 18:00$/);
  });

  it("correr días respeta el calendario local", () => {
    expect(inicioDelDia(sumarDias(NOCHE, -1)).toISOString()).toBe(
      "2026-09-09T05:00:00.000Z",
    );
  });

  it("el mes arranca el primero a medianoche de Medellín", () => {
    expect(inicioDelMes(NOCHE).toISOString()).toBe("2026-09-01T05:00:00.000Z");
  });

  it("la semana arranca el lunes", () => {
    // El 10 de septiembre de 2026 es jueves.
    expect(diaDeLaSemana(NOCHE)).toBe(3);
  });
});

describe("los períodos del panel", () => {
  it("«Hoy» a las 7:30 p.m. incluye las ventas de esa tarde", () => {
    const { from, to } = resolvePeriod("hoy", undefined, NOCHE);

    expect(VENTA >= from && VENTA <= to).toBe(true);
  });

  it("«Ayer» no se traga las ventas de esta tarde", () => {
    const { from, to } = resolvePeriod("ayer", undefined, NOCHE);

    expect(VENTA >= from && VENTA <= to).toBe(false);
    expect(from.toISOString()).toBe("2026-09-09T05:00:00.000Z");
    expect(to.toISOString()).toBe("2026-09-10T04:59:59.999Z");
  });

  it("«Esta semana» arranca el lunes a medianoche de Medellín", () => {
    const { from, to } = resolvePeriod("semana", undefined, NOCHE);

    expect(from.toISOString()).toBe("2026-09-07T05:00:00.000Z");
    expect(VENTA >= from && VENTA <= to).toBe(true);
  });

  it("«Este mes» cubre la tarde de hoy", () => {
    const { from, to } = resolvePeriod("mes", undefined, NOCHE);

    expect(VENTA >= from && VENTA <= to).toBe(true);
  });

  it("un rango escrito a mano se lee como día de Medellín, no como UTC", () => {
    const { from, to } = resolvePeriod(
      "personalizado",
      { from: "2026-09-10", to: "2026-09-10" },
      NOCHE,
    );

    expect(from.toISOString()).toBe("2026-09-10T05:00:00.000Z");
    expect(to.toISOString()).toBe("2026-09-11T04:59:59.999Z");
    expect(VENTA >= from && VENTA <= to).toBe(true);
  });
});

describe("las fechas escritas en un formulario", () => {
  it("se guardan en el día de Medellín, no en el de UTC", () => {
    // Un gasto puesto el 11 se archivaba como del 10 a las 7 p.m.
    expect(fechaDelFormulario("2026-09-11")?.toISOString()).toBe(
      "2026-09-11T05:00:00.000Z",
    );
    expect(fechaDelFormulario("2026-09-11", "fin")?.toISOString()).toBe(
      "2026-09-12T04:59:59.999Z",
    );
  });

  it("sin fecha no inventa una", () => {
    expect(fechaDelFormulario(undefined)).toBeNull();
    expect(fechaDelFormulario("")).toBeNull();
  });

  it("una fecha que no se entiende queda inválida, para que el llamador avise", () => {
    expect(fechaDelFormulario("no-es-fecha")?.getTime()).toBeNaN();
  });
});
