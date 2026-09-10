export function formatCOP(value: number): string {
  return "$" + Math.round(value).toLocaleString("es-CO");
}

export function formatSignedCOP(value: number): string {
  const rounded = Math.round(value);
  return (rounded > 0 ? "+" : "") + formatCOP(rounded);
}
