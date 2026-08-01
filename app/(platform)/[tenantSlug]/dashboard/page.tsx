import { DashboardView } from "@/components/modules/dashboard/dashboard-view";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const context = await requireAuthenticatedTenantContext();
  return <DashboardView context={context} />;
}
