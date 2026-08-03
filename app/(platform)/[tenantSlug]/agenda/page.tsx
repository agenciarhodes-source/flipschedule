import { RealAgendaView } from "@/components/modules/agenda/real-agenda-view";
import { getApplicationContext } from "@/lib/auth/application-context";
import { createPrismaReaders } from "@/domains/infrastructure/prisma/factory";

export default async function AgendaPage() {
  const context=await getApplicationContext(); const readers=createPrismaReaders(context); const now=new Date();const from=new Date(now);from.setUTCDate(from.getUTCDate()-7);const to=new Date(now);to.setUTCDate(to.getUTCDate()+31);
  const [appointments,clinics,professionals,procedures,resources]=await Promise.all([readers.appointments.list({range:{from:from.toISOString(),to:to.toISOString()},limit:100}),readers.clinics.list({limit:100}),readers.professionals.list({limit:100}),readers.procedures.list({limit:100}),readers.resources.list({limit:100})]);
  return <RealAgendaView tenantSlug={context.tenantSlug} timezone={context.tenantTimezone} appointments={appointments.items} clinics={clinics.items} professionals={professionals.items} procedures={procedures.items} resources={resources.items}/>;
}
