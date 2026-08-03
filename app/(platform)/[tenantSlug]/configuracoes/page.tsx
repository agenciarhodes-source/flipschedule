import { RealSettingsView } from "@/components/modules/settings/real-settings-view";
import { getApplicationContext } from "@/lib/auth/application-context";
import { createPrismaReaders } from "@/domains/infrastructure/prisma/factory";

export default async function ConfiguracoesPage() {
  const context=await getApplicationContext();const readers=createPrismaReaders(context);const [organization,clinics,professionals,procedures,resources,workingHours,consents]=await Promise.all([readers.organization.read(),readers.clinics.list({limit:100}),readers.professionals.list({limit:100}),readers.procedures.list({limit:100}),readers.resources.list({limit:100}),readers.workingHours.list({limit:100}),readers.reports.read({from:new Date(Date.now()-365*864e5).toISOString(),to:new Date().toISOString()})]);
  return <RealSettingsView organization={organization} consentPatients={consents.consentPatients} revokedConsents={consents.revokedConsents} tenantSlug={context.tenantSlug} clinics={clinics.items} professionals={professionals.items} procedures={procedures.items} resources={resources.items} workingHours={workingHours.items}/>;
}
