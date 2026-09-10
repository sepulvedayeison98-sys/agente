import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encrypt, SESSION_COOKIE } from "@/lib/session-token";
import { proxy } from "@/proxy";

beforeAll(() => {
  process.env.SESSION_SECRET = "secreto-solo-para-pruebas";
});

async function cookieFor(role: "VENDEDOR" | "ADMINISTRADOR") {
  const expiresAt = new Date(Date.now() + 60_000);
  return encrypt(
    { userId: "u1", role, branchId: "b1", name: "Prueba" },
    expiresAt,
  );
}

function requestTo(path: string, token?: string) {
  const request = new NextRequest(`http://localhost:3000${path}`);
  if (token) request.cookies.set(SESSION_COOKIE, token);
  return request;
}

function redirectTarget(response: Response) {
  return response.headers.get("location");
}

describe("permisos por rol", () => {
  it("manda al login a quien no tiene sesión", async () => {
    const response = await proxy(requestTo("/pos"));

    expect(response.status).toBe(307);
    expect(redirectTarget(response)).toContain("/login");
  });

  it("deja pasar al login sin sesión", async () => {
    const response = await proxy(requestTo("/login"));

    expect(redirectTarget(response)).toBeNull();
  });

  it("devuelve al POS al vendedor que intenta entrar al panel de administración", async () => {
    const token = await cookieFor("VENDEDOR");
    const response = await proxy(requestTo("/admin/dashboard", token));

    expect(response.status).toBe(307);
    expect(redirectTarget(response)).toContain("/pos");
  });

  it("deja al administrador entrar al panel", async () => {
    const token = await cookieFor("ADMINISTRADOR");
    const response = await proxy(requestTo("/admin/dashboard", token));

    expect(redirectTarget(response)).toBeNull();
  });

  it("deja al vendedor en sus propias pantallas", async () => {
    const token = await cookieFor("VENDEDOR");

    for (const path of ["/pos", "/carrito", "/cobro", "/mis-ventas", "/cierre"]) {
      const response = await proxy(requestTo(path, token));
      expect(redirectTarget(response), path).toBeNull();
    }
  });

  it("rechaza una cookie de sesión manipulada", async () => {
    const token = await cookieFor("VENDEDOR");
    const tampered = token.slice(0, -4) + "aaaa";
    const response = await proxy(requestTo("/pos", tampered));

    expect(redirectTarget(response)).toContain("/login");
  });

  it("rechaza una cookie firmada con otro secreto", async () => {
    const token = await cookieFor("ADMINISTRADOR");
    vi.stubEnv("SESSION_SECRET", "otro-secreto-distinto");

    const response = await proxy(requestTo("/admin/dashboard", token));

    expect(redirectTarget(response)).toContain("/login");
    vi.unstubAllEnvs();
  });
});

// El panel vive en src/app/(admin)/admin/<ruta>. Se leen del disco para que
// una pantalla nueva quede cubierta sola, sin acordarse de tocar esta prueba.
const ADMIN_DIR = new URL("../src/app/(admin)/", import.meta.url).pathname;

function adminFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx" || entry.name === "layout.tsx") found.push(full);
    }
  };
  walk(ADMIN_DIR);
  return found;
}

function adminRoutes(): string[] {
  return adminFiles()
    .filter((file) => file.endsWith("page.tsx"))
    .map((file) => "/" + relative(ADMIN_DIR, file).replace(/\/page\.tsx$/, ""));
}

describe("el vendedor no entra al panel del administrador", () => {
  it("hay pantallas de administración que cubrir", () => {
    expect(adminRoutes().length).toBeGreaterThan(0);
  });

  it("ninguna ruta del panel se le abre al vendedor", async () => {
    const token = await cookieFor("VENDEDOR");

    for (const route of adminRoutes()) {
      const response = await proxy(requestTo(route, token));
      expect(redirectTarget(response), route).toContain("/pos");
    }
  });

  it("todas se le abren al administrador", async () => {
    const token = await cookieFor("ADMINISTRADOR");

    for (const route of adminRoutes()) {
      const response = await proxy(requestTo(route, token));
      expect(redirectTarget(response), route).toBeNull();
    }
  });

  // Segunda barrera: aunque el proxy fallara, el servidor vuelve a preguntar.
  it("cada pantalla del panel exige administrador por su cuenta", () => {
    for (const file of adminFiles()) {
      const source = readFileSync(file, "utf8");
      expect(source, relative(ADMIN_DIR, file)).toContain("requireAdmin");
    }
  });
});
