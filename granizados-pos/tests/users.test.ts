import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./reset";
import {
  changePin,
  createUser,
  setUserActive,
  updateUser,
} from "@/server/users";
import type { SessionPayload } from "@/lib/session-token";

const ADMIN: SessionPayload = {
  userId: "u_admin",
  role: "ADMINISTRADOR",
  branchId: "b1",
  name: "Esteban",
};
const VENDEDOR: SessionPayload = {
  userId: "u_helen",
  role: "VENDEDOR",
  branchId: "b1",
  name: "Helen",
};

async function seed() {
  await resetDatabase();
  await prisma.branch.create({ data: { id: "b1", name: "Sucursal" } });
  await prisma.user.createMany({
    data: [
      { id: "u_admin", name: "Esteban", username: "esteban", pinHash: "x", role: "ADMINISTRADOR", branchId: "b1" },
      { id: "u_helen", name: "Helen", username: "helen", pinHash: "x", role: "VENDEDOR", branchId: "b1" },
    ],
  });
}

const find = async (username: string) =>
  prisma.user.findUniqueOrThrow({ where: { username } });

beforeEach(seed);

describe("crear personas", () => {
  it("guarda el nombre, el usuario en minúsculas y el rol", async () => {
    const result = await createUser(ADMIN, {
      name: "Camila",
      username: "  CAMILA  ",
      pin: "4321",
      role: "VENDEDOR",
    });

    expect(result.ok).toBe(true);
    const camila = await find("camila");
    expect(camila).toMatchObject({ name: "Camila", role: "VENDEDOR", active: true });
  });

  it("el PIN queda cifrado, nunca en claro", async () => {
    await createUser(ADMIN, { name: "Camila", username: "camila", pin: "4321", role: "VENDEDOR" });

    const camila = await find("camila");
    expect(camila.pinHash).not.toBe("4321");
    expect(await bcrypt.compare("4321", camila.pinHash)).toBe(true);
  });

  it("exige un PIN de 4 a 6 dígitos", async () => {
    for (const pin of ["123", "1234567", "abcd", ""]) {
      const result = await createUser(ADMIN, {
        name: "Camila",
        username: "camila",
        pin,
        role: "VENDEDOR",
      });
      expect(result.ok, pin).toBe(false);
    }
    expect(await prisma.user.count()).toBe(2);
  });

  it("rechaza un usuario repetido", async () => {
    const result = await createUser(ADMIN, {
      name: "Otra Helen",
      username: "Helen",
      pin: "1234",
      role: "VENDEDOR",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("ya existe");
  });

  it("rechaza un usuario con espacios o tildes", async () => {
    for (const username of ["ca mila", "camilá", "ab"]) {
      expect(
        (await createUser(ADMIN, { name: "X", username, pin: "1234", role: "VENDEDOR" })).ok,
        username,
      ).toBe(false);
    }
  });

  it("el vendedor no puede crear personas", async () => {
    const result = await createUser(VENDEDOR, {
      name: "Camila",
      username: "camila",
      pin: "1234",
      role: "ADMINISTRADOR",
    });

    expect(result.ok).toBe(false);
    expect(await prisma.user.count()).toBe(2);
  });
});

describe("cambiar el PIN", () => {
  it("lo reemplaza", async () => {
    await changePin(ADMIN, { userId: "u_helen", pin: "999999" });

    expect(await bcrypt.compare("999999", (await find("helen")).pinHash)).toBe(true);
  });

  it("adelanta credentialsAt, que es lo que corta la sesión abierta", async () => {
    const antes = (await find("helen")).credentialsAt;

    await changePin(ADMIN, { userId: "u_helen", pin: "5555" });

    const despues = (await find("helen")).credentialsAt;
    expect(despues.getTime()).toBeGreaterThan(antes.getTime());
  });

  it("limpia los intentos fallidos: el PIN ya es otro", async () => {
    await prisma.loginAttempt.createMany({
      data: Array.from({ length: 6 }, () => ({ username: "helen", ok: false })),
    });

    await changePin(ADMIN, { userId: "u_helen", pin: "5555" });

    expect(await prisma.loginAttempt.count({ where: { username: "helen" } })).toBe(0);
  });

  it("rechaza un PIN que no sirve", async () => {
    const result = await changePin(ADMIN, { userId: "u_helen", pin: "12" });

    expect(result.ok).toBe(false);
    expect((await find("helen")).pinHash).toBe("x");
  });

  it("el vendedor no puede cambiar PINs", async () => {
    const result = await changePin(VENDEDOR, { userId: "u_admin", pin: "9999" });

    expect(result.ok).toBe(false);
    expect((await find("esteban")).pinHash).toBe("x");
  });

  it("deja rastro en auditoría", async () => {
    await changePin(ADMIN, { userId: "u_helen", pin: "5555" });

    const entry = await prisma.auditLog.findFirst({ where: { action: "pin_cambiado" } });
    expect(entry?.newValue).toMatchObject({ usuario: "helen" });
  });
});

describe("activar y desactivar", () => {
  it("desactivar deja la persona sin entrada pero conserva su historial", async () => {
    await setUserActive(ADMIN, { userId: "u_helen", active: false });

    expect((await find("helen")).active).toBe(false);
    // Sigue existiendo: sus ventas pasadas siguen apuntando a ella.
    expect(await prisma.user.count()).toBe(2);
  });

  it("desactivar corta la sesión abierta", async () => {
    const antes = (await find("helen")).credentialsAt;

    await setUserActive(ADMIN, { userId: "u_helen", active: false });

    expect((await find("helen")).credentialsAt.getTime()).toBeGreaterThan(antes.getTime());
  });

  it("se puede reactivar", async () => {
    await setUserActive(ADMIN, { userId: "u_helen", active: false });
    await setUserActive(ADMIN, { userId: "u_helen", active: true });

    expect((await find("helen")).active).toBe(true);
  });

  it("nadie se desactiva a sí mismo", async () => {
    const result = await setUserActive(ADMIN, { userId: "u_admin", active: false });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("a ti mismo");
    expect((await find("esteban")).active).toBe(true);
  });

  it("no se puede desactivar al único administrador", async () => {
    await createUser(ADMIN, { name: "Otro", username: "otro", pin: "1234", role: "ADMINISTRADOR" });
    const otro = await find("otro");

    // Con dos administradores sí se puede desactivar a uno.
    expect((await setUserActive(ADMIN, { userId: otro.id, active: false })).ok).toBe(true);

    // Y ahora el que queda no puede quedarse sin par: lo intenta otro admin.
    const result = await setUserActive(
      { ...ADMIN, userId: otro.id },
      { userId: "u_admin", active: false },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("único administrador");
  });
});

describe("editar nombre y rol", () => {
  it("cambia el nombre sin tocar el usuario para entrar", async () => {
    await updateUser(ADMIN, { userId: "u_helen", name: "Helen Restrepo", role: "VENDEDOR" });

    const helen = await find("helen");
    expect(helen.name).toBe("Helen Restrepo");
    expect(helen.username).toBe("helen");
  });

  it("puede ascender a alguien a administrador", async () => {
    await updateUser(ADMIN, { userId: "u_helen", name: "Helen", role: "ADMINISTRADOR" });

    expect((await find("helen")).role).toBe("ADMINISTRADOR");
  });

  it("el último administrador no se puede degradar", async () => {
    const result = await updateUser(ADMIN, {
      userId: "u_admin",
      name: "Esteban",
      role: "VENDEDOR",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("único administrador");
    expect((await find("esteban")).role).toBe("ADMINISTRADOR");
  });

  it("exige un nombre", async () => {
    const result = await updateUser(ADMIN, { userId: "u_helen", name: "   ", role: "VENDEDOR" });

    expect(result.ok).toBe(false);
  });

  it("el vendedor no puede editar a nadie", async () => {
    const result = await updateUser(VENDEDOR, {
      userId: "u_helen",
      name: "Helen Jefa",
      role: "ADMINISTRADOR",
    });

    expect(result.ok).toBe(false);
    expect((await find("helen")).role).toBe("VENDEDOR");
  });
});
