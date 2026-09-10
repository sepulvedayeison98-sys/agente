/**
 * Paleta cerrada para los sabores. Es una lista fija y no un selector libre
 * por dos razones: en un teléfono elegir de una rejilla es más rápido que
 * afinar un tono, y así ningún sabor termina con un color que no se lea sobre
 * el fondo oscuro o que se confunda con el morado del acento, que significa
 * "seleccionado" y nada más.
 */
export const FLAVOR_COLORS = [
  { value: "#ff6b81", label: "Rosa" },
  { value: "#ff5f52", label: "Rojo" },
  { value: "#ff9838", label: "Naranja" },
  { value: "#ffd23f", label: "Amarillo" },
  { value: "#f2e94e", label: "Amarillo claro" },
  { value: "#a8e05f", label: "Verde lima" },
  { value: "#4fd1a5", label: "Verde" },
  { value: "#4cc9f0", label: "Azul" },
  { value: "#c2549e", label: "Vino" },
  { value: "#e0a3d0", label: "Lila" },
] as const;

export type FlavorColor = (typeof FLAVOR_COLORS)[number]["value"];

export function isFlavorColor(value: unknown): value is FlavorColor {
  return FLAVOR_COLORS.some((color) => color.value === value);
}
