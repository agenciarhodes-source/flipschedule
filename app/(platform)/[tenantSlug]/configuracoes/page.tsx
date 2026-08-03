import { RealSettingsView } from "@/components/modules/settings/real-settings-view";
import { getApplicationContext } from "@/lib/auth/application-context";
import { createPrismaReaders } from "@/domains/infrastructure/prisma/factory";

export default async function ConfiguracoesPage() {
  const context=await getApplicationContext();const readers=createPrismaReaders(context);const [clinics,professionals,procedures,resources,workingHours]=await Promise.all([readers.clinics.list({limit:100}),readers.professionals.list({limit:100}),readers.procedures.list({limit:100}),readers.resources.list({limit:100}),readers.workingHours.list({limit:100})]);
  return <RealSettingsView tenantSlug={context.tenantSlug} clinics={clinics.items} professionals={professionals.items} procedures={procedures.items} resources={resources.items} workingHours={workingHours.items}/>;
}
