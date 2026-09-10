import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./reset";
import { activePromo, describePromo } from "@/server/promo";

async function seed() {
  await resetDatabase();

  await prisma.product.create({
    data: { id: "granizado", name: "Granizado", type: "granizado" },
  });
  await prisma.size.create({
    data: { id: "m", name: "Mediano", price: 6000, productId: "granizado" },
  });
  await prisma.flavor.create({ data: { id: "pina", name: "Piña" } });
  await prisma.addon.create({
    data: { id: "fruta", name: "Fruta", price: 1500, cost: 600 },
  });
}

async function createPromo(overrides: { active?: boolean; name?: string } = {}) {
  return prisma.promo.create({
    data: {
      name: overrides.name ?? "Piña mediano + fruta",
      sizeId: "m",
      flavorId: "pina",
      discount: 1500,
      active: overrides.active ?? true,
      addons: { create: [{ addonId: "fruta" }] },
    },
  });
}

beforeEach(seed);

describe("promo del día", () => {
  it("sin promos creadas no hay nada que mostrar", async () => {
    expect(await activePromo()).toBeNull();
  });

  it("devuelve la promo activa con su combinación", async () => {
    await createPromo();

    const promo = await activePromo();

    expect(promo).toMatchObject({
      name: "Piña mediano + fruta",
      sizeId: "m",
      flavorId: "pina",
      discount: 1500,
    });
    expect(promo?.addonIds).toEqual(["fruta"]);
  });

  it("ignora las promos desactivadas", async () => {
    await createPromo({ active: false });

    expect(await activePromo()).toBeNull();
  });

  it("se esconde si el administrador oculta el sabor", async () => {
    await createPromo();
    await prisma.flavor.update({ where: { id: "pina" }, data: { visible: false } });

    expect(await activePromo()).toBeNull();
  });

  it("se esconde si oculta el tamaño", async () => {
    await createPromo();
    await prisma.size.update({ where: { id: "m" }, data: { visible: false } });

    expect(await activePromo()).toBeNull();
  });

  it("se esconde si oculta una adición incluida", async () => {
    await createPromo();
    await prisma.addon.update({ where: { id: "fruta" }, data: { visible: false } });

    expect(await activePromo()).toBeNull();
  });

  it("con varias activas muestra la más reciente", async () => {
    await createPromo({ name: "Vieja" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await createPromo({ name: "Nueva" });

    expect((await activePromo())?.name).toBe("Nueva");
  });
});

describe("describePromo", () => {
  it("arma el texto con adiciones", () => {
    expect(describePromo("Mediano", "Piña", ["Fruta"])).toBe(
      "Piña mediano + fruta",
    );
  });

  it("sin adiciones deja solo sabor y tamaño", () => {
    expect(describePromo("Grande", "Mora", [])).toBe("Mora grande");
  });
});
