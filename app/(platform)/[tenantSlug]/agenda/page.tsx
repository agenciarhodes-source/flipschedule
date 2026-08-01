import { AgendaView } from "@/components/modules/agenda/agenda-view";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";

export default async function AgendaPage() {
  await requireAuthenticatedTenantContext();
  return <AgendaView />;
}
