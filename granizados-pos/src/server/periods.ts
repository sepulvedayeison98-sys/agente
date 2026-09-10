export type PeriodId = "hoy" | "ayer" | "semana" | "mes" | "personalizado";

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
  { id: "personalizado", label: "Personalizado" },
];

export type Range = { from: Date; to: Date };

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * La semana arranca el lunes, que es como se cuenta el negocio en Colombia.
 */
export function resolvePeriod(
  period: PeriodId,
  custom?: { from?: string; to?: string },
  now: Date = new Date(),
): Range {
  switch (period) {
    case "ayer": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case "semana": {
      const monday = new Date(now);
      const weekday = (monday.getDay() + 6) % 7;
      monday.setDate(monday.getDate() - weekday);
      return { from: startOfDay(monday), to: endOfDay(now) };
    }
    case "mes": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(first), to: endOfDay(now) };
    }
    case "personalizado": {
      const from = custom?.from ? new Date(custom.from) : startOfDay(now);
      const to = custom?.to ? new Date(custom.to) : now;
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return { from: startOfDay(now), to: endOfDay(now) };
      }
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export function isPeriodId(value: string | undefined): value is PeriodId {
  return PERIODS.some((period) => period.id === value);
}
