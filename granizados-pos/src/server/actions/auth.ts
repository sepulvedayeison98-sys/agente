"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import {
  checkLoginThrottle,
  recordLoginAttempt,
  waitLabel,
} from "@/server/login-throttle";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // El teclado del teléfono suele mandar la primera letra en mayúscula.
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const pin = String(formData.get("pin") ?? "");

  if (!username || !pin) {
    return { error: "Escribe tu usuario y tu PIN." };
  }

  // Antes de mirar el PIN: si esta cuenta viene fallando, se hace esperar.
  const throttle = await checkLoginThrottle(username);
  if (throttle.blocked) {
    return {
      error: `Demasiados intentos fallidos. Espera ${waitLabel(
        throttle.retryInSeconds,
      )} antes de volver a intentar.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const ok = Boolean(
    user && user.active && (await bcrypt.compare(pin, user.pinHash)),
  );

  await recordLoginAttempt(username, ok);

  // Mismo mensaje para usuario inexistente y PIN incorrecto: no revela cuáles
  // usuarios existen.
  if (!ok || !user) {
    return { error: "Usuario o PIN incorrecto." };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    branchId: user.branchId,
    name: user.name,
  });

  redirect(user.role === "ADMINISTRADOR" ? "/admin/dashboard" : "/pos");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
