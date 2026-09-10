import { prisma } from "@/lib/prisma";

/**
 * Las pruebas comparten una sola base, así que cada archivo arranca de cero.
 * El orden importa: primero lo que apunta a otras tablas, para no chocar con
 * las llaves foráneas.
 */
export async function resetDatabase() {
  await prisma.cashMovement.deleteMany();
  await prisma.cashClosure.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.saleItemAddon.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.promoAddon.deleteMany();
  await prisma.promo.deleteMany();
  await prisma.recipeLine.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.addon.deleteMany();
  await prisma.flavor.deleteMany();
  await prisma.size.deleteMany();
  await prisma.product.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
}
