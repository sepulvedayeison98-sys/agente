import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "./reset";
import {
  checkLoginThrottle,
  recordLoginAttempt,
  waitLabel,
} from "@/server/login-throttle";

async function seed() {
  await resetDatabase();
  await prisma.branch.create({ data: { id: "b1", name: "Sucursal" } });
  await prisma.user.create({
    data: {
      id: "u_helen",
      name: "Helen",
      username: "helen",
      pinHash: "x",
      role: "VENDEDOR",
      branchId: "b1",
    },
  });
}

async function fail(times: number, username = "helen") {
  for (let i = 0; i < times; i++) await recordLoginAttempt(username, false);
}

beforeEach(seed);
afterEach(() => vi.useRealTimers());

describe("freno de fuerza bruta en el login", () => {
  it("deja entrar mientras no haya racha de fallos", async () => {
    await fail(4);
    expect(await checkLoginThrottle("helen")).toEqual({ blocked: false });
  });

  it("al quinto fallo hace esperar", async () => {
    await fail(5);

    const verdict = await checkLoginThrottle("helen");

    expect(verdict.blocked).toBe(true);
    if (!verdict.blocked) return;
    expect(verdict.retryInSeconds).toBeGreaterThan(0);
    expect(verdict.retryInSeconds).toBeLessThanOrEqual(30);
  });

  it("la espera crece con los fallos", async () => {
    await fail(10);
    const diez = await checkLoginThrottle("helen");

    await fail(10);
    const veinte = await checkLoginThrottle("helen");

    expect(diez.blocked && veinte.blocked).toBe(true);
    if (!diez.blocked || !veinte.blocked) return;
    expect(diez.retryInSeconds).toBeGreaterThan(30);
    expect(veinte.retryInSeconds).toBeGreaterThan(diez.retryInSeconds);
  });

  it("cumplida la espera vuelve a dejar intentar", async () => {
    await fail(5);
    expect((await checkLoginThrottle("helen")).blocked).toBe(true);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 31_000);

    expect(await checkLoginThrottle("helen")).toEqual({ blocked: false });
  });

  it("entrar bien limpia la racha", async () => {
    await fail(9);
    await recordLoginAttempt("helen", true);
    await fail(1);

    // Un fallo después de un acierto es un fallo, no el décimo.
    expect(await checkLoginThrottle("helen")).toEqual({ blocked: false });
  });

  it("el bloqueo es por usuario y no deja fuera a los demás", async () => {
    await fail(20);

    expect((await checkLoginThrottle("helen")).blocked).toBe(true);
    expect(await checkLoginThrottle("juan")).toEqual({ blocked: false });
  });

  it("frena también a quien prueba usuarios que no existen", async () => {
    await fail(5, "administrador");

    expect((await checkLoginThrottle("administrador")).blocked).toBe(true);
  });

  it("deja rastro en auditoría al cruzar un umbral", async () => {
    await fail(5);

    const entry = await prisma.auditLog.findFirst({
      where: { action: "login_bloqueado" },
    });
    expect(entry?.newValue).toMatchObject({
      usuario: "helen",
      fallosSeguidos: 5,
    });
  });

  it("no audita un usuario inexistente: no hay cuenta que proteger", async () => {
    await fail(5, "administrador");

    expect(await prisma.auditLog.count({ where: { action: "login_bloqueado" } })).toBe(0);
  });

  it("no llena la auditoría con cada fallo", async () => {
    await fail(9);

    // Solo el quinto cruzó un umbral.
    expect(await prisma.auditLog.count({ where: { action: "login_bloqueado" } })).toBe(1);
  });

  it("los fallos viejos dejan de contar", async () => {
    await fail(20);
    expect((await checkLoginThrottle("helen")).blocked).toBe(true);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);

    expect(await checkLoginThrottle("helen")).toEqual({ blocked: false });
  });
});

describe("el texto de la espera", () => {
  it("habla en segundos, minutos u horas, nunca en 3600 s", () => {
    expect(waitLabel(30)).toBe("30 segundos");
    expect(waitLabel(60)).toBe("1 minuto");
    expect(waitLabel(300)).toBe("5 minutos");
    expect(waitLabel(3600)).toBe("1 hora");
  });
});
