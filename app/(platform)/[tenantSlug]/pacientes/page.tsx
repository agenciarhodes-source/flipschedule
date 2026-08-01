import { PatientsView } from "@/components/modules/patients/patients-view";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";

export default async function PacientesPage() {
  await requireAuthenticatedTenantContext();
  return <PatientsView />;
}
