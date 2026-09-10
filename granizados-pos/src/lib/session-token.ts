import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "granizados_session";
export const SESSION_DAYS = 7;

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
    return payload as SessionPayload & { exp?: number };
  } catch {
    return null;
  }
}
