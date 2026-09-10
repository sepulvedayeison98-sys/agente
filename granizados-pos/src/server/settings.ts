import "server-only";
import { prisma } from "@/lib/prisma";

export const SETTINGS = [
  {
    key: "descuento_inventario",
    label: "Descuento automático de inventario",
    note: "Aplica la receta de cada producto",
    fallback: true,
  },
  {
    key: "alertas_minimo",
    label: "Alertas de inventario bajo",
    note: "Notifica al llegar al mínimo",
    fallback: true,
  },
  {
    key: "propina_sugerida",
    label: "Propina sugerida",
    note: "Muestra opción al cobrar",
    fallback: false,
  },
  {
    key: "recibo_digital",
    label: "Recibo digital",
    note: "Enviar por WhatsApp",
    fallback: true,
  },
  {
    key: "anulacion_admin",
    label: "Anulación requiere administrador",
    note: "El vendedor solo puede solicitarla",
    fallback: true,
  },
] as const;

export type SettingKey = (typeof SETTINGS)[number]["key"];

export async function getSettings(): Promise<Record<SettingKey, boolean>> {
  const stored = await prisma.setting.findMany();
  const byKey = new Map(stored.map((entry) => [entry.key, entry.value]));

  const result = {} as Record<SettingKey, boolean>;
  for (const setting of SETTINGS) {
    const value = byKey.get(setting.key);
    result[setting.key] = value === undefined ? setting.fallback : value === "true";
  }
  return result;
}

export async function getSetting(key: SettingKey): Promise<boolean> {
  const settings = await getSettings();
  return settings[key];
}
