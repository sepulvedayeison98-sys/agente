import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return {
    userId: session.userId,
    role: session.role,
    branchId: session.branchId,
    name: session.name,
  };
});

export const requireAdmin = cache(async (): Promise<SessionPayload> => {
  const session = await verifySession();
  if (session.role !== "ADMINISTRADOR") {
    redirect("/pos");
  }
  return session;
});
