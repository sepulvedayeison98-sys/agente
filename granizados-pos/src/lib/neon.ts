/**
 * Los colores de neón de la marca, para las tarjetas del POS.
 *
 * No significan estado —para eso está la intensidad: una tarjeta apagada lleva
 * su color al 30 %, la elegida al 100 % y con halo—. Sirven para reconocer un
 * producto por su color cuando hay fila y no hay tiempo de leer.
 */
export const NEON = {
  rosa: "#ff2bd6",
  morado: "#a855f7",
  azul: "#00a8ff",
  verde: "#39ff14",
  amarillo: "#ffe600",
  naranja: "#ff9d00",
  rojo: "#ff3158",
  cian: "#00e5ff",
} as const;

/**
 * Los tamaños se pintan por su posición, que viene ordenada por precio: el más
 * barato rosa y el más caro el que toque. Como el precio los ordena siempre
 * igual, cada tamaño conserva su color entre cargas.
 */
const POR_TAMANO = [
  NEON.rosa,
  NEON.azul,
  NEON.morado,
  NEON.verde,
  NEON.naranja,
  NEON.cian,
  NEON.amarillo,
  NEON.rojo,
];

/**
 * Las adiciones no se pintan por posición sino por su identificador.
 *
 * Varias cuestan lo mismo, así que el orden entre ellas no está garantizado de
 * una carga a otra: por posición, una gomita cambiaría de color al recargar y
 * se perdería justo lo que hace útil el color, que es reconocerla sin leer.
 */
const POR_ADICION = [
  NEON.azul,
  NEON.cian,
  NEON.naranja,
  NEON.rojo,
  NEON.amarillo,
  NEON.morado,
  NEON.rosa,
  NEON.verde,
];

export const neonPorTamano = (index: number): string =>
  POR_TAMANO[index % POR_TAMANO.length];

/**
 * Varias adiciones llevan un color en el nombre —"Brocha azul", "Labio rojo"—,
 * y pintarlas de otro las vuelve confusas: el operario lee "azul" y ve amarillo.
 * Cuando el nombre dice el color, ese manda; si no dice nada, el color sale del
 * identificador para que al menos sea siempre el mismo.
 */
const EN_EL_NOMBRE: [RegExp, string][] = [
  [/\brosa(do|da)?\b/i, NEON.rosa],
  [/\b(morad|violeta|lila|p[úu]rpura)/i, NEON.morado],
  [/\bazul(es)?\b/i, NEON.azul],
  [/\bverde(s)?\b/i, NEON.verde],
  [/\bamarill/i, NEON.amarillo],
  [/\b(naranja|mandarina)\b/i, NEON.naranja],
  [/\broj(o|a)s?\b/i, NEON.rojo],
  [/\bcian\b/i, NEON.cian],
];

export const neonPorAdicion = (id: string, name = ""): string => {
  const nombrado = EN_EL_NOMBRE.find(([patron]) => patron.test(name));
  return nombrado ? nombrado[1] : POR_ADICION[huella(id) % POR_ADICION.length];
};

/** FNV-1a: un número estable a partir del id, igual en el servidor y en el navegador. */
function huella(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
