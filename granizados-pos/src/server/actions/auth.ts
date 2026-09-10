"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

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

  const user = await prisma.user.findUnique({ where: { username } });

  // Mismo mensaje para usuario inexistente y PIN incorrecto: no revela cuáles
  // usuarios existen.
  if (!user || !user.active || !(await bcrypt.compare(pin, user.pinHash))) {
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
