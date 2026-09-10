import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Freno de fuerza bruta para el login.
 *
 * El PIN es de cuatro dígitos y los usuarios son tres, con nombres que
 * cualquiera adivina. Sin esto, probar las diez mil combinaciones de una
 * cuenta no cuesta nada. El bloqueo crece con los fallos seguidos y se cuenta
 * por usuario, que es lo que un atacante no puede cambiar a voluntad —una IP
 * sí—, y a la vez es lo único que no deja fuera al local entero cuando todos
 * comparten la misma conexión.
 */

/** Fallos seguidos → cuánto hay que esperar antes del siguiente intento. */
const STEPS: { after: number; waitMs: number }[] = [
  { after: 20, waitMs: 60 * 60 * 1000 },
  { after: 10, waitMs: 5 * 60 * 1000 },
  { after: 5, waitMs: 30 * 1000 },
];

/** Más allá de esto un fallo ya no cuenta: fue otro día, otra historia. */
const WINDOW_MS = 24 * 60 * 60 * 1000;

export type ThrottleVerdict =
  | { blocked: false }
  | { blocked: true; retryInSeconds: number };

function waitFor(failures: number): number {
  return STEPS.find((step) => failures >= step.after)?.waitMs ?? 0;
}

/**
 * Cuántos fallos seguidos lleva el usuario y cuándo fue el último. Los
 * intentos anteriores al último acierto no cuentan: entrar bien limpia la
 * cuenta.
 */
async function recentFailures(username: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const attempts = await prisma.loginAttempt.findMany({
    where: { username, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { ok: true, createdAt: true },
    take: 40,
  });

  let failures = 0;
  for (const attempt of attempts) {
    if (attempt.ok) break;
    failures++;
  }

  return { failures, last: attempts[0]?.createdAt ?? null };
}

/** Se llama antes de comparar el PIN. */
export async function checkLoginThrottle(
  username: string,
): Promise<ThrottleVerdict> {
  const { failures, last } = await recentFailures(username);
  const wait = waitFor(failures);
  if (!wait || !last) return { blocked: false };

  const elapsed = Date.now() - last.getTime();
  if (elapsed >= wait) return { blocked: false };

  return {
    blocked: true,
    retryInSeconds: Math.ceil((wait - elapsed) / 1000),
  };
}

/** Se llama después, con el resultado. */
export async function recordLoginAttempt(username: string, ok: boolean) {
  await prisma.loginAttempt.create({ data: { username, ok } });

  if (ok) return;

  const { failures } = await recentFailures(username);
  // Solo se audita al cruzar un umbral: así el registro señala el ataque en vez
  // de llenarse con el dedo torpe de todos los días.
  if (!STEPS.some((step) => step.after === failures)) return;

  // La auditoría cuelga de un usuario real. Si el nombre no existe no hay a
  // quién colgarla —y tampoco hay cuenta que proteger—; el bloqueo funciona
  // igual, que es lo que frena al que va probando nombres.
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!user) return;

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "login_bloqueado",
      entity: "User",
      entityId: user.id,
      newValue: {
        usuario: username,
        fallosSeguidos: failures,
        esperaSegundos: Math.round(waitFor(failures) / 1000),
      },
    },
  });
}

/** Texto para el vendedor: en segundos o en minutos, nunca en "3600 s". */
export function waitLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} segundos`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? "hora" : "horas"}`;
}
