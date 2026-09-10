export type RecipeLineInput = {
  sizeId: string;
  inventoryItemId: string | null;
  resolveItemFromFlavor: boolean;
  quantityPerUnit: number;
};

export type ConsumptionLine = {
  sizeId: string;
  flavorInventoryItemId: string | null;
  quantity: number;
  addons: { inventoryItemId: string | null; useQuantityPerUnit: number }[];
};

// Las cantidades son kilos y litros con decimales: sin redondeo, sumar 0.1 + 0.2
// deja residuos que se acumulan venta tras venta.
const PRECISION = 1000;

export function round(value: number): number {
  return Math.round(value * PRECISION) / PRECISION;
}

/**
 * Traduce lo vendido a consumo de insumos: vaso y hielo salen de la receta del
 * tamaño, la pulpa usa la cantidad del tamaño pero el insumo del sabor vendido,
 * y cada adición gasta su propio insumo.
 */
export function computeConsumption(
  lines: ConsumptionLine[],
  recipes: RecipeLineInput[],
): Map<string, number> {
  const consumption = new Map<string, number>();

  const take = (itemId: string | null, quantity: number) => {
    if (!itemId || quantity <= 0) return;
    consumption.set(itemId, round((consumption.get(itemId) ?? 0) + quantity));
  };

  for (const line of lines) {
    for (const recipe of recipes) {
      if (recipe.sizeId !== line.sizeId) continue;
      const itemId = recipe.resolveItemFromFlavor
        ? line.flavorInventoryItemId
        : recipe.inventoryItemId;
      take(itemId, recipe.quantityPerUnit * line.quantity);
    }

    for (const addon of line.addons) {
      take(addon.inventoryItemId, addon.useQuantityPerUnit * line.quantity);
    }
  }

  return consumption;
}
