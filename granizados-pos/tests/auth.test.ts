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
