import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const BRANCH_ID = "sucursal_principal";
const PRODUCT_ID = "granizado";

const INVENTORY = [
  { id: "hielo", name: "Hielo", unit: "kg", quantity: 35, minimum: 10 },
  { id: "p_mango", name: "Pulpa de mango", unit: "kg", quantity: 12, minimum: 5 },
  { id: "p_fresa", name: "Pulpa de fresa", unit: "kg", quantity: 8, minimum: 5 },
  { id: "p_maracuya", name: "Pulpa de maracuyá", unit: "kg", quantity: 6, minimum: 5 },
  { id: "p_mora", name: "Pulpa de mora", unit: "kg", quantity: 7, minimum: 5 },
  { id: "p_pina", name: "Pulpa de piña", unit: "kg", quantity: 9, minimum: 5 },
  { id: "p_limon", name: "Pulpa de limón", unit: "kg", quantity: 4, minimum: 5 },
  { id: "v_peq", name: "Vasos pequeños", unit: "unid", quantity: 150, minimum: 30 },
  { id: "v_med", name: "Vasos medianos", unit: "unid", quantity: 118, minimum: 30 },
  { id: "v_gra", name: "Vasos grandes", unit: "unid", quantity: 85, minimum: 20 },
  { id: "v_fam", name: "Vasos familiares", unit: "unid", quantity: 40, minimum: 15 },
  { id: "gomitas", name: "Gomitas", unit: "kg", quantity: 4, minimum: 1 },
  { id: "fruta", name: "Fruta picada", unit: "kg", quantity: 5, minimum: 2 },
  { id: "leche", name: "Leche condensada", unit: "latas", quantity: 6, minimum: 2 },
  { id: "crema", name: "Crema", unit: "kg", quantity: 3, minimum: 1 },
  { id: "salsa", name: "Salsa", unit: "l", quantity: 2, minimum: 1 },
];

const SIZES = [
  { id: "p", name: "Pequeño", price: 4000, cup: "v_peq", ice: 0.25, pulp: 0.06 },
  { id: "m", name: "Mediano", price: 6000, cup: "v_med", ice: 0.35, pulp: 0.09 },
  { id: "g", name: "Grande", price: 8000, cup: "v_gra", ice: 0.5, pulp: 0.12 },
  { id: "f", name: "Familiar", price: 12000, cup: "v_fam", ice: 0.9, pulp: 0.2 },
];

const FLAVORS = [
  { id: "fresa", name: "Fresa", item: "p_fresa" },
  { id: "mango", name: "Mango", item: "p_mango" },
  { id: "maracuya", name: "Maracuyá", item: "p_maracuya" },
  { id: "mora", name: "Mora", item: "p_mora" },
  { id: "pina", name: "Piña", item: "p_pina" },
  { id: "limon", name: "Limón", item: "p_limon" },
];

const ADDONS = [
  { id: "gomitas", name: "Gomitas", price: 1000, cost: 350, item: "gomitas", use: 0.03 },
  { id: "fruta", name: "Fruta", price: 1500, cost: 600, item: "fruta", use: 0.05 },
  { id: "leche", name: "Leche condensada", price: 1500, cost: 500, item: "leche", use: 0.08 },
  { id: "crema", name: "Crema", price: 1000, cost: 300, item: "crema", use: 0.04 },
  { id: "salsa", name: "Salsa", price: 800, cost: 250, item: "salsa", use: 0.02 },
];

const EXPENSE_CATEGORIES = ["Materia prima", "Empaques", "Transporte", "Servicios"];

// PINs de desarrollo — cambiar antes de usar en producción.
const USERS = [
  { id: "u_admin", name: "Camilo Restrepo", username: "camilo", pin: "9999", role: "ADMINISTRADOR" as const },
  { id: "u_sara", name: "Sara Muñoz", username: "sara", pin: "1234", role: "VENDEDOR" as const },
  { id: "u_juan", name: "Juan Ospina", username: "juan", pin: "1234", role: "VENDEDOR" as const },
];

async function main() {
  await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    update: { name: "Sucursal principal", isDefault: true },
    create: { id: BRANCH_ID, name: "Sucursal principal", isDefault: true },
  });

  for (const user of USERS) {
    const pinHash = await bcrypt.hash(user.pin, 10);
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name, username: user.username, role: user.role, branchId: BRANCH_ID },
      create: {
        id: user.id,
        name: user.name,
        username: user.username,
        pinHash,
        role: user.role,
        branchId: BRANCH_ID,
      },
    });
  }

  for (const item of INVENTORY) {
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: { name: item.name, unit: item.unit, minimum: item.minimum },
      create: item,
    });
  }

  await prisma.product.upsert({
    where: { id: PRODUCT_ID },
    update: { name: "Granizado", type: "granizado" },
    create: { id: PRODUCT_ID, name: "Granizado", type: "granizado" },
  });

  for (const size of SIZES) {
    await prisma.size.upsert({
      where: { id: size.id },
      update: { name: size.name, price: size.price },
      create: { id: size.id, name: size.name, price: size.price, productId: PRODUCT_ID },
    });

    await prisma.recipeLine.deleteMany({ where: { sizeId: size.id } });
    await prisma.recipeLine.createMany({
      data: [
        { sizeId: size.id, inventoryItemId: size.cup, quantityPerUnit: 1 },
        { sizeId: size.id, inventoryItemId: "hielo", quantityPerUnit: size.ice },
        { sizeId: size.id, resolveItemFromFlavor: true, quantityPerUnit: size.pulp },
      ],
    });
  }

  for (const flavor of FLAVORS) {
    await prisma.flavor.upsert({
      where: { id: flavor.id },
      update: { name: flavor.name, inventoryItemId: flavor.item },
      create: { id: flavor.id, name: flavor.name, inventoryItemId: flavor.item },
    });
  }

  for (const addon of ADDONS) {
    await prisma.addon.upsert({
      where: { id: addon.id },
      update: {
        name: addon.name,
        price: addon.price,
        cost: addon.cost,
        inventoryItemId: addon.item,
        useQuantityPerUnit: addon.use,
      },
      create: {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        cost: addon.cost,
        inventoryItemId: addon.item,
        useQuantityPerUnit: addon.use,
      },
    });
  }

  for (const name of EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const existingPromo = await prisma.promo.findFirst();
  if (!existingPromo) {
    await prisma.promo.create({
      data: {
        name: "Piña mediano + fruta",
        sizeId: "m",
        flavorId: "pina",
        discount: 1500,
        addons: { create: [{ addonId: "fruta" }] },
      },
    });
  }

  console.log("Seed completado.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
