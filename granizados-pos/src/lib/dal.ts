import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "@/lib/session";

/**
 * El token dice quién eres; la base dice si eso sigue siendo cierto.
 *
 * Un token firmado vale hasta que caduca, así que cambiar un PIN o desactivar
 * a alguien no lo sacaba de la app hasta dos horas después. Aquí se compara
 * contra `credentialsAt`: si las credenciales cambiaron después de firmar el
 * token, la sesión ya no vale.
 *
 * Todas las pantallas —incluidas las públicas— preguntan por aquí. Si el login
 * mirara solo la cookie y el POS mirara la base, una sesión revocada rebotaría
 * entre las dos para siempre.
 *
 * Es una consulta por petición, deduplicada por `cache()`; para un negocio de
 * tres personas eso no se nota.
 */
export const currentUser = cache(async (): Promise<SessionPayload | null> => {
  const session = await getSession();
  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, role: true, active: true, credentialsAt: true },
  });
  if (!user || !user.active) return null;

  const signedAt = session.iat ? session.iat * 1000 : 0;
  if (user.credentialsAt.getTime() > signedAt) return null;

  return {
    userId: session.userId,
    branchId: session.branchId,
    // El nombre y el rol salen de la base, no del token: si cambian, la app los
    // refleja sin esperar a que la persona vuelva a entrar.
    name: user.name,
    role: user.role,
  };
});

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await currentUser();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export const requireAdmin = cache(async (): Promise<SessionPayload> => {
  const session = await verifySession();
  if (session.role !== "ADMINISTRADOR") {
    redirect("/pos");
  }
  return session;
});
