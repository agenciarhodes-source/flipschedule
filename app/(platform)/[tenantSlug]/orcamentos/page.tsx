import { PlansView } from "@/components/modules/treatment-plans/plans-view";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";

export default async function OrcamentosPage() {
  await requireAuthenticatedTenantContext();
  return <PlansView />;
}
