import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import type { SessionPayload } from "@/lib/session-token";

/**
 * Gestión de las personas que entran a la app.
 *
 * Hasta ahora los usuarios solo se creaban sembrando la base, así que cambiar
 * un PIN o sacar del negocio a alguien que se fue obligaba a tocar la base a
 * mano. Las reglas de aquí existen para que el administrador no se deje fuera
 * a sí mismo ni deje el negocio sin nadie que pueda administrarlo.
 */

export type UserResult = { ok: true } | { ok: false; error: string };

const PIN_PATTERN = /^\d{4,6}$/;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,20}$/;

function denyNonAdmin(session: SessionPayload): string | null {
  return session.role === "ADMINISTRADOR"
    ? null
    : "Solo el administrador puede gestionar usuarios.";
}

function checkPin(pin: string): string | null {
  return PIN_PATTERN.test(pin)
    ? null
    : "El PIN debe tener entre 4 y 6 dígitos, sin letras.";
}

/**
 * ¿El cambio dejaría al negocio sin ningún administrador activo? Sin esta
 * comprobación, el único administrador podría degradarse o desactivarse y
 * nadie podría volver a entrar al panel —ni arreglarlo desde la app.
 */
async function wouldLeaveNoAdmin(
  userId: string,
  next: { role?: Role; active?: boolean },
): Promise<boolean> {
  const stillAdmin =
    (next.role ?? "ADMINISTRADOR") === "ADMINISTRADOR" && (next.active ?? true);
  if (stillAdmin) return false;

  const others = await prisma.user.count({
    where: { role: "ADMINISTRADOR", active: true, id: { not: userId } },
  });
  return others === 0;
}

export async function createUser(
  session: SessionPayload,
  input: { name: string; username: string; pin: string; role: Role },
): Promise<UserResult> {
  const denied = denyNonAdmin(session);
  if (denied) return { ok: false, error: denied };

  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();

  if (!name) return { ok: false, error: "Escribe el nombre de la persona." };
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error:
        "El usuario va entre 3 y 20 caracteres: letras sin tilde, números, punto, guion o guion bajo.",
    };
  }
  const badPin = checkPin(input.pin);
  if (badPin) return { ok: false, error: badPin };

  if (await prisma.user.findUnique({ where: { username } })) {
    return { ok: false, error: `El usuario ${username} ya existe.` };
  }

  const created = await prisma.user.create({
    data: {
      name,
      username,
      pinHash: await bcrypt.hash(input.pin, 10),
      role: input.role,
      branchId: session.branchId,
    },
  });

  await audit(session, "usuario_creado", created.id, {
    nombre: name,
    usuario: username,
    rol: input.role,
  });

  return { ok: true };
}

/** Cambia el nombre visible y el rol. El usuario para entrar no se toca. */
export async function updateUser(
  session: SessionPayload,
  input: { userId: string; name: string; role: Role },
): Promise<UserResult> {
  const denied = denyNonAdmin(session);
  if (denied) return { ok: false, error: denied };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escribe el nombre de la persona." };

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { ok: false, error: "Esa persona ya no existe." };

  if (await wouldLeaveNoAdmin(input.userId, { role: input.role })) {
    return {
      ok: false,
      error:
        "Es el único administrador activo. Nombra a otro antes de cambiarle el rol.",
    };
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: { name, role: input.role },
  });

  await audit(
    session,
    "usuario_actualizado",
    user.id,
    { nombre: name, rol: input.role },
    { nombre: user.name, rol: user.role },
  );

  return { ok: true };
}

/**
 * Cambiar el PIN corta las sesiones abiertas de esa persona: `credentialsAt`
 * avanza y los tokens firmados antes dejan de valer. Es el punto del ejercicio
 * —si alguien vio el PIN, cambiarlo tiene que sacarlo ya, no en dos horas.
 */
export async function changePin(
  session: SessionPayload,
  input: { userId: string; pin: string },
): Promise<UserResult> {
  const denied = denyNonAdmin(session);
  if (denied) return { ok: false, error: denied };

  const badPin = checkPin(input.pin);
  if (badPin) return { ok: false, error: badPin };

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { ok: false, error: "Esa persona ya no existe." };

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      pinHash: await bcrypt.hash(input.pin, 10),
      credentialsAt: new Date(),
    },
  });

  // Los intentos fallidos previos ya no aplican: el PIN es otro.
  await prisma.loginAttempt.deleteMany({ where: { username: user.username } });

  await audit(session, "pin_cambiado", user.id, { usuario: user.username });

  return { ok: true };
}

/** Desactivar saca a la persona ya mismo; su historial de ventas se conserva. */
export async function setUserActive(
  session: SessionPayload,
  input: { userId: string; active: boolean },
): Promise<UserResult> {
  const denied = denyNonAdmin(session);
  if (denied) return { ok: false, error: denied };

  if (input.userId === session.userId && !input.active) {
    return { ok: false, error: "No puedes desactivarte a ti mismo." };
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { ok: false, error: "Esa persona ya no existe." };

  if (await wouldLeaveNoAdmin(input.userId, { active: input.active })) {
    return {
      ok: false,
      error:
        "Es el único administrador activo. Nombra a otro antes de desactivarlo.",
    };
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      active: input.active,
      // Al desactivar, la sesión abierta muere con el cambio.
      ...(input.active ? {} : { credentialsAt: new Date() }),
    },
  });

  await audit(
    session,
    input.active ? "usuario_activado" : "usuario_desactivado",
    user.id,
    { usuario: user.username, activo: input.active },
  );

  return { ok: true };
}

/** Los valores de auditoría son planos: es lo que Prisma acepta como Json. */
type AuditValue = Record<string, string | number | boolean | null>;

async function audit(
  session: SessionPayload,
  action: string,
  entityId: string,
  newValue: AuditValue,
  oldValue?: AuditValue,
) {
  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action,
      entity: "User",
      entityId,
      oldValue,
      newValue,
    },
  });
}
