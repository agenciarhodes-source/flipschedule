import { CrmView } from "@/components/modules/crm/crm-view";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";

export default async function CrmPage() {
  await requireAuthenticatedTenantContext();
  return <CrmView />;
}
