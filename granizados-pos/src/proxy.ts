import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  decrypt,
  encrypt,
  SESSION_COOKIE,
  SESSION_MS,
  SESSION_RENEW_AFTER_MS,
} from "@/lib/session-token";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  // Un token vencido no descifra, así que esto cubre también la expiración.
  if (!session?.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMINISTRADOR") {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  return withRenewedSession(NextResponse.next(), session);
}

/**
 * La sesión cuenta inactividad, no antigüedad: cada pantalla que se abre le
 * devuelve el tiempo completo. Quien está vendiendo nunca se queda por fuera;
 * quien dejó el teléfono abierto sí.
 */
async function withRenewedSession(
  response: NextResponse,
  session: Awaited<ReturnType<typeof decrypt>>,
) {
  if (!session) return response;

  const remaining = session.exp ? session.exp * 1000 - Date.now() : 0;
  if (remaining > SESSION_RENEW_AFTER_MS) return response;

  const expiresAt = new Date(Date.now() + SESSION_MS);
  const { userId, role, branchId, name } = session;
  const token = await encrypt({ userId, role, branchId, name }, expiresAt);

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
