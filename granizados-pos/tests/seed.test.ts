import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

/**
 * El seed corre en cada despliegue, dentro de `vercel-build`. Cuando reescribía
 * lo que ya estaba en la base, cada cambio de código le borraba al negocio los
 * precios que había puesto esa mañana. Esta prueba lo corre de verdad —proceso
 * aparte, base aparte— y comprueba que un segundo despliegue no pisa nada.
 */

const require_ = createRequire(import.meta.url);
const Database = require_("better-sqlite3");

const DB = "tests/.seed-test.db";
// El seed crea su propio cliente contra `src/generated/prisma`, que es el de
// PostgreSQL. Aquí se corre contra el cliente SQLite de las pruebas.
const COPIA = "tests/.seed-copia.ts";
const CLIENTE = fileURLToPath(new URL("./.generated/prisma/client", import.meta.url));

writeFileSync(
  COPIA,
  readFileSync("prisma/seed.ts", "utf8").replace(
    '"../src/generated/prisma/client"',
    JSON.stringify(CLIENTE),
  ),
);

const abrir = () => new Database(DB);

function correrSeed(env: Record<string, string> = {}) {
  execFileSync("npx", ["tsx", COPIA], {
    env: { ...process.env, DATABASE_URL: `file:./${DB}`, ...env },
    stdio: "pipe",
  });
}

const leer = <T>(sql: string, ...params: unknown[]): T => {
  const db = abrir();
  try {
    return db.prepare(sql).get(...params) as T;
  } finally {
    db.close();
  }
};

const escribir = (sql: string, ...params: unknown[]) => {
  const db = abrir();
  try {
    db.prepare(sql).run(...params);
  } finally {
    db.close();
  }
};

beforeEach(() => {
  rmSync(DB, { force: true });
  const db = abrir();
  db.exec(readFileSync("tests/.schema.sql", "utf8"));
  db.close();
});

afterAll(() => {
  for (const path of [DB, COPIA]) rmSync(path, { force: true });
});

describe("el seed en una base vacía", () => {
  it("siembra el catálogo para poder empezar a vender", () => {
    correrSeed();

    expect(leer<{ c: number }>("select count(*) c from Size").c).toBe(4);
    expect(leer<{ c: number }>("select count(*) c from Flavor").c).toBe(6);
    expect(leer<{ c: number }>("select count(*) c from User").c).toBe(3);
    expect(leer<{ c: number }>("select count(*) c from RecipeLine").c).toBe(12);
  });
});

describe("el seed en una base que ya trabaja", () => {
  beforeEach(() => {
    correrSeed({ SEED_PIN_ADMIN: "111111" });
    escribir("update Size set price = 9500, name = 'Grande XL' where id = 'g'");
    escribir("update Addon set price = 4300 where id = 'gomitas'");
    escribir("update Flavor set name = 'Fresa criolla' where id = 'fresa'");
    escribir("update RecipeLine set quantityPerUnit = 0.99 where sizeId = 'g'");
    escribir("update User set pinHash = 'el-pin-del-admin' where id = 'u_admin'");
    escribir("delete from Flavor where id = 'limon'");
  });

  it("no le toca los precios al administrador", () => {
    correrSeed({ SEED_PIN_ADMIN: "111111" });

    expect(leer<{ price: number; name: string }>("select price, name from Size where id = 'g'"))
      .toMatchObject({ price: 9500, name: "Grande XL" });
    expect(leer<{ price: number }>("select price from Addon where id = 'gomitas'").price).toBe(4300);
  });

  it("no le toca los sabores ni las recetas", () => {
    correrSeed();

    expect(leer<{ name: string }>("select name from Flavor where id = 'fresa'").name)
      .toBe("Fresa criolla");
    expect(
      leer<{ c: number }>("select count(*) c from RecipeLine where sizeId = 'g' and quantityPerUnit = 0.99").c,
    ).toBe(3);
  });

  it("no revive lo que el administrador borró a propósito", () => {
    correrSeed();

    expect(leer<{ c: number }>("select count(*) c from Flavor where id = 'limon'").c).toBe(0);
  });

  it("no reescribe los PINs, ni con SEED_PIN_* puestas", () => {
    correrSeed({ SEED_PIN_ADMIN: "111111", SEED_PIN_SARA: "222222" });

    expect(leer<{ pinHash: string }>("select pinHash from User where id = 'u_admin'").pinHash)
      .toBe("el-pin-del-admin");
  });

  it("con SEED_RESET_PINS=1 sí los restablece: es la salida si nadie recuerda el PIN", () => {
    correrSeed({ SEED_PIN_ADMIN: "111111", SEED_RESET_PINS: "1" });

    const admin = leer<{ pinHash: string }>("select pinHash from User where id = 'u_admin'");
    expect(admin.pinHash).not.toBe("el-pin-del-admin");
    // Y solo eso: los precios siguen siendo los del negocio.
    expect(leer<{ price: number }>("select price from Size where id = 'g'").price).toBe(9500);
  });
});
