import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./reset";
import { activePromo } from "@/server/promo";

/**
 * Una promo desaparece del POS cuando su combinación deja de ser vendible. La
 * regla es correcta —vender una promo con un sabor que ya no existe no tiene
 * sentido— pero al administrador le pasaba en silencio: la tarjeta se iba sin
 * decir por qué. Estas pruebas fijan cuándo se va.
 */

async function seed() {
  await resetDatabase();
  await prisma.product.create({
    data: { id: "granizado", name: "Granizado", type: "granizado" },
  });
  await prisma.size.create({
    data: { id: "med", name: "Mediano", price: 6000, productId: "granizado" },
  });
  await prisma.flavor.create({ data: { id: "pina", name: "Piña" } });
  await prisma.addon.create({
    data: { id: "fruta", name: "Fruta", price: 1500, cost: 600 },
  });
  await prisma.promo.create({
    data: {
      id: "p1",
      name: "Piña mediano + fruta",
      sizeId: "med",
      flavorId: "pina",
      discount: 1500,
      active: true,
      addons: { create: [{ addonId: "fruta" }] },
    },
  });
}

beforeEach(seed);

describe("cuándo se muestra la promo del día", () => {
  it("sale cuando toda su combinación se puede vender", async () => {
    const promo = await activePromo();

    expect(promo?.name).toBe("Piña mediano + fruta");
  });

  it("se va si ocultan su sabor", async () => {
    await prisma.flavor.update({ where: { id: "pina" }, data: { visible: false } });

    expect(await activePromo()).toBeNull();
  });

  it("se va si eliminan su sabor", async () => {
    // Es el caso que se vio en producción: quedó un solo sabor visible y la
    // promo, que era de Piña, dejó de aparecer.
    await prisma.flavor.update({ where: { id: "pina" }, data: { active: false } });

    expect(await activePromo()).toBeNull();
  });

  it("se va si ocultan o eliminan su tamaño", async () => {
    await prisma.size.update({ where: { id: "med" }, data: { visible: false } });
    expect(await activePromo()).toBeNull();

    await prisma.size.update({
      where: { id: "med" },
      data: { visible: true, active: false },
    });
    expect(await activePromo()).toBeNull();
  });

  it("se va si ocultan o eliminan una de sus adiciones", async () => {
    await prisma.addon.update({ where: { id: "fruta" }, data: { visible: false } });
    expect(await activePromo()).toBeNull();

    await prisma.addon.update({
      where: { id: "fruta" },
      data: { visible: true, active: false },
    });
    expect(await activePromo()).toBeNull();
  });

  it("vuelve sola en cuanto el sabor se muestra de nuevo", async () => {
    await prisma.flavor.update({ where: { id: "pina" }, data: { visible: false } });
    expect(await activePromo()).toBeNull();

    await prisma.flavor.update({ where: { id: "pina" }, data: { visible: true } });
    expect((await activePromo())?.name).toBe("Piña mediano + fruta");
  });

  it("una promo desactivada no sale aunque todo esté visible", async () => {
    await prisma.promo.update({ where: { id: "p1" }, data: { active: false } });

    expect(await activePromo()).toBeNull();
  });
});
