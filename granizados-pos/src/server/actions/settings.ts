"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { SETTINGS, type SettingKey } from "@/server/settings";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setSetting(
  key: SettingKey,
  value: boolean,
): Promise<ActionResult> {
  const session = await requireAdmin();

  const known = SETTINGS.find((setting) => setting.key === key);
  if (!known) return { ok: false, error: "Ese ajuste no existe." };

  const previous = await prisma.setting.findUnique({ where: { key } });

  await prisma.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "cambio_configuracion",
      entity: "Setting",
      entityId: key,
      oldValue: {
        [known.label]: previous ? previous.value === "true" : known.fallback,
      },
      newValue: { [known.label]: value },
    },
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/inventario");
  return { ok: true };
}
