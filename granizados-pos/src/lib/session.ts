import "server-only";
import { cookies } from "next/headers";
import {
  decrypt,
  encrypt,
  SESSION_COOKIE,
  SESSION_MS,
  type SessionPayload,
} from "@/lib/session-token";

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const token = await encrypt(payload, expiresAt);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export type { SessionPayload };
