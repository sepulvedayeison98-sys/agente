import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./reset";
import { FLAVOR_COLORS, isFlavorColor } from "@/lib/flavor-colors";
import { createCatalogItem, updateCatalogLink } from "@/server/actions/catalog";

// Las acciones del catálogo exigen administrador vía requireAdmin, que lee la
// cookie de sesión. Aquí solo interesa el color, así que se da por concedido.
vi.mock("@/lib/dal", () => ({
  requireAdmin: async () => ({
    userId: "u_admin",
    role: "ADMINISTRADOR" as const,
    branchId: "b1",
    name: "Esteban",
  }),
  verifySession: async () => ({
    userId: "u_admin",
    role: "ADMINISTRADOR" as const,
    branchId: "b1",
    name: "Esteban",
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

beforeEach(async () => {
  await resetDatabase();
  await prisma.branch.create({ data: { id: "b1", name: "Sucursal" } });
  await prisma.user.create({
    data: {
      id: "u_admin",
      name: "Esteban",
      username: "esteban",
      pinHash: "x",
      role: "ADMINISTRADOR",
      branchId: "b1",
    },
  });
});

const flavor = async (name: string) =>
  prisma.flavor.findFirstOrThrow({ where: { name } });

describe("color del sabor", () => {
  it("se guarda al crear el sabor", async () => {
    const result = await createCatalogItem("flavors", {
      name: "Coco",
      color: "#4cc9f0",
    });

    expect(result.ok).toBe(true);
    expect((await flavor("Coco")).color).toBe("#4cc9f0");
  });

  it("se puede cambiar después", async () => {
    await createCatalogItem("flavors", { name: "Coco", color: "#4cc9f0" });
    const coco = await flavor("Coco");

    await updateCatalogLink("flavors", coco.id, { color: "#ff6b81" });

    expect((await flavor("Coco")).color).toBe("#ff6b81");
  });

  it("se puede quitar", async () => {
    await createCatalogItem("flavors", { name: "Coco", color: "#4cc9f0" });
    const coco = await flavor("Coco");

    await updateCatalogLink("flavors", coco.id, { color: null });

    expect((await flavor("Coco")).color).toBeNull();
  });

  it("un sabor sin color se guarda igual", async () => {
    await createCatalogItem("flavors", { name: "Coco" });

    expect((await flavor("Coco")).color).toBeNull();
  });

  it("rechaza un color fuera de la paleta", async () => {
    // El valor llega del navegador: uno cualquiera podría no leerse sobre el
    // fondo oscuro o confundirse con el color del acento.
    await createCatalogItem("flavors", { name: "Coco", color: "#000000" });

    expect((await flavor("Coco")).color).toBeNull();
  });

  it("ningún color de la paleta es el acento", () => {
    // El acento se lee de los tokens, no se copia aquí: si mañana cambia el
    // color de la marca, esta prueba sigue comprobando lo que dice comprobar.
    const css = readFileSync("src/app/globals.css", "utf8");
    const accent = css.match(/--color-accent:\s*(#[0-9a-f]{6})/i)?.[1];

    expect(accent).toBeTruthy();
    expect(FLAVOR_COLORS.map((c) => c.value)).not.toContain(accent!.toLowerCase());
  });

  it("la paleta no tiene colores repetidos", () => {
    const values = FLAVOR_COLORS.map((c) => c.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("isFlavorColor distingue lo que está en la paleta", () => {
    expect(isFlavorColor("#ff6b81")).toBe(true);
    expect(isFlavorColor("#123456")).toBe(false);
    expect(isFlavorColor(null)).toBe(false);
  });
});
