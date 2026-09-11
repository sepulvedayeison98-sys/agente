import {
  diaDeLaSemana,
  fechaDelFormulario,
  finDelDia,
  inicioDelDia,
  inicioDelMes,
  sumarDias,
} from "@/lib/dia";

export type PeriodId = "hoy" | "ayer" | "semana" | "mes" | "personalizado";

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
  { id: "personalizado", label: "Personalizado" },
];

export type Range = { from: Date; to: Date };

/**
 * La semana arranca el lunes, que es como se cuenta el negocio en Colombia.
 *
 * Todos los cortes se hacen con el reloj de Medellín, no con el del servidor:
 * ver `@/lib/dia`.
 */
export function resolvePeriod(
  period: PeriodId,
  custom?: { from?: string; to?: string },
  now: Date = new Date(),
): Range {
  switch (period) {
    case "ayer": {
      const ayer = sumarDias(now, -1);
      return { from: inicioDelDia(ayer), to: finDelDia(ayer) };
    }
    case "semana": {
      const lunes = sumarDias(now, -diaDeLaSemana(now));
      return { from: inicioDelDia(lunes), to: finDelDia(now) };
    }
    case "mes": {
      return { from: inicioDelMes(now), to: finDelDia(now) };
    }
    case "personalizado": {
      // Las fechas del formulario vienen como "2026-09-11", que `new Date`
      // interpreta como medianoche UTC: en Medellín eso es el día anterior a
      // las 7 p.m. Se leen como día de calendario y se anclan a la zona.
      const from = fechaDelFormulario(custom?.from) ?? inicioDelDia(now);
      const to = fechaDelFormulario(custom?.to, "fin") ?? finDelDia(now);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return { from: inicioDelDia(now), to: finDelDia(now) };
      }
      return { from, to };
    }
    default:
      return { from: inicioDelDia(now), to: finDelDia(now) };
  }
}

export function isPeriodId(value: string | undefined): value is PeriodId {
  return PERIODS.some((period) => period.id === value);
}

