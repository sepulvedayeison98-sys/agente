import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "granizados_session";

/**
 * La sesión dura dos horas sin actividad y se renueva sola mientras se use.
 * Un turno completo no la corta; un teléfono que quedó abierto en el mostrador
 * al cerrar sí queda cerrado.
 */
export const SESSION_MS = 2 * 60 * 60 * 1000;

/**
 * Solo se vuelve a firmar cuando ya se gastó la mitad del tiempo: renovar en
 * cada toque sería firmar decenas de veces por venta sin ganar nada.
 */
export const SESSION_RENEW_AFTER_MS = SESSION_MS / 2;

export type SessionPayload = {
  userId: string;
  role: Role;
  branchId: string;
  name: string;
};

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getKey());
}

export async function decrypt(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    // `iat` importa: es la fecha de firma con la que se compara si las
    // credenciales del usuario cambiaron después.
    return payload as SessionPayload & { exp?: number; iat?: number };
  } catch {
    return null;
  }
}
