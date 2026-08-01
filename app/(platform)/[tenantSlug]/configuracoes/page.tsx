import { SettingsView } from "@/components/modules/settings/settings-view";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";

export default async function ConfiguracoesPage() {
  await requireAuthenticatedTenantContext();
  return <SettingsView />;
}
