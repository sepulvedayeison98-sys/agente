/**
 * Las fechas del negocio se cuentan en Medellín, no donde esté el servidor.
 *
 * `setHours(0,0,0,0)` usa la zona horaria del proceso, y en Vercel eso es UTC.
 * Con UTC el día cambia a las 7 de la noche hora de Medellín: justo en mitad de
 * la jornada de un negocio de granizados. Cada noche a esa hora el panel se
 * quedaba en cero y las ventas de la tarde se iban a "Ayer".
 *
 * Aquí el día se arma con `Intl`, que conoce la zona de verdad, en vez de
 * restarle cinco horas a mano: si algún día Colombia cambia de huso, esto sigue
 * siendo cierto sin tocar nada.
 */

export const ZONA_NEGOCIO = "America/Bogota";

const PARTES = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_NEGOCIO,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type Partes = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** La fecha y la hora tal como se leen en un reloj de Medellín. */
export function partesEnZona(date: Date): Partes {
  const partes = Object.fromEntries(
    PARTES.formatToParts(date)
      .filter((parte) => parte.type !== "literal")
      .map((parte) => [parte.type, Number(parte.value)]),
  ) as Partes;

  // A medianoche algunos motores devuelven la hora 24 en vez de 0.
  return { ...partes, hour: partes.hour % 24 };
}

/** Cuánto va la zona por delante de UTC en ese instante, en milisegundos. */
function desfase(date: Date): number {
  const { year, month, day, hour, minute, second } = partesEnZona(date);
  const comoSiFueraUTC = Date.UTC(year, month - 1, day, hour, minute, second);
  return comoSiFueraUTC - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * El instante exacto en que el reloj de Medellín marca esa fecha y esa hora.
 *
 * Se calcula en dos pasos porque el desfase depende del instante, y el instante
 * es lo que se está buscando: primero se aproxima tratando la hora local como
 * si fuera UTC, y con el desfase de esa aproximación se corrige.
 */
export function instanteEnZona(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const aproximado = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const corregido = aproximado - desfase(new Date(aproximado));
  // Una segunda pasada por si la aproximación cayó al otro lado de un cambio
  // de huso. Con un huso fijo como el de Colombia no cambia nada.
  return new Date(aproximado - desfase(new Date(corregido)));
}

export function inicioDelDia(date: Date = new Date()): Date {
  const { year, month, day } = partesEnZona(date);
  return instanteEnZona(year, month, day);
}

export function finDelDia(date: Date = new Date()): Date {
  const { year, month, day } = partesEnZona(date);
  return instanteEnZona(year, month, day, 23, 59, 59, 999);
}

/** Corre días de calendario, no bloques de 24 horas. */
export function sumarDias(date: Date, dias: number): Date {
  const { year, month, day, hour, minute, second } = partesEnZona(date);
  return instanteEnZona(year, month, day + dias, hour, minute, second);
}

export function inicioDelMes(date: Date = new Date()): Date {
  const { year, month } = partesEnZona(date);
  return instanteEnZona(year, month, 1);
}

/** El día de la semana en Medellín, con el lunes en cero. */
export function diaDeLaSemana(date: Date = new Date()): number {
  const { year, month, day } = partesEnZona(date);
  // Date.UTC con la fecha local da el día correcto: solo importa la fecha.
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/** La hora del reloj de Medellín, para agrupar las ventas por hora. */
export function horaDelDia(date: Date): number {
  return partesEnZona(date).hour;
}

/**
 * El formato de las horas que se muestran, en un solo lugar.
 *
 * Cada pantalla llamaba a `toLocaleTimeString` por su cuenta y ninguna pasaba
 * la zona, así que todas pintaban la hora del servidor: una venta de las 3 de
 * la tarde salía a las 8 de la noche.
 */
const HORA = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA_NEGOCIO,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const FECHA_Y_HORA = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA_NEGOCIO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatHora = (date: Date): string => HORA.format(date);
export const formatFechaHora = (date: Date): string => FECHA_Y_HORA.format(date);

/**
 * Lo que manda un `<input type="date">`: "2026-09-11".
 *
 * `new Date("2026-09-11")` lo lee como medianoche UTC, que en Medellín es el
 * día anterior a las 7 de la noche. Un gasto puesto el día 11 se archivaba
 * como del 10. Se parte a mano y se ancla al día de calendario de Medellín.
 */
export function fechaDelFormulario(
  value: string | undefined,
  momento: "inicio" | "fin" = "inicio",
): Date | null {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(value);

  const [, year, month, day] = match.map(Number);
  return momento === "fin"
    ? instanteEnZona(year, month, day, 23, 59, 59, 999)
    : instanteEnZona(year, month, day);
}
