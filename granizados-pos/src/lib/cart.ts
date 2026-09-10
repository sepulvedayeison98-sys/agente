export type CartAddon = {
  id: string;
  name: string;
  price: number;
};

export type CartLine = {
  id: string;
  sizeId: string;
  sizeName: string;
  sizePrice: number;
  flavorId: string;
  flavorName: string;
  addons: CartAddon[];
  quantity: number;
};

// Los precios que viajan en el carrito son solo para mostrar; el servidor
// recalcula todo contra la base de datos al confirmar la venta.
export function lineUnitPrice(line: CartLine): number {
  return line.sizePrice + line.addons.reduce((total, a) => total + a.price, 0);
}

export function lineSubtotal(line: CartLine): number {
  return lineUnitPrice(line) * line.quantity;
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + lineSubtotal(line), 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function lineTitle(line: CartLine): string {
  return `Granizado ${line.sizeName.toLowerCase()} · ${line.flavorName}`;
}

export function lineSubtitle(line: CartLine): string {
  return line.addons.length
    ? line.addons.map((a) => a.name).join(" + ")
    : "Sin adiciones";
}

// Identifica una combinación para no duplicar líneas iguales en el carrito.
export function combinationKey(
  sizeId: string,
  flavorId: string,
  addonIds: string[],
): string {
  return [sizeId, flavorId, [...addonIds].sort().join(",")].join("|");
}

export function lineKey(line: CartLine): string {
  return combinationKey(
    line.sizeId,
    line.flavorId,
    line.addons.map((a) => a.id),
  );
}
