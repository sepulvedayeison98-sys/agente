import { requireAdmin } from "@/lib/dal";
import { getSettings, SETTINGS } from "@/server/settings";
import { SettingsList } from "./settings-list";

export default async function AdminConfiguracionPage() {
  await requireAdmin();

  const values = await getSettings();

  return (
    <SettingsList
      settings={SETTINGS.map((setting) => ({
        key: setting.key,
        label: setting.label,
        note: setting.note,
        value: values[setting.key],
      }))}
    />
  );
}
