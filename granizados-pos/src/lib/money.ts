export function formatCOP(value: number): string {
  return "$" + Math.round(value).toLocaleString("es-CO");
}

export function formatSignedCOP(value: number): string {
  const rounded = Math.round(value);
  return (rounded > 0 ? "+" : "") + formatCOP(rounded);
}

// Los insumos van en kilos, litros y unidades: se muestran los decimales que
// realmente tengan, sin rellenar con ceros.
export function formatQuantity(value: number): string {
  return value.toLocaleString("es-CO", { maximumFractionDigits: 3 });
}
