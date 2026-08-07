import { AccountEmailVerification } from "@/components/modules/settings/account-email-verification";
import { ClinicAccessSettings } from "@/components/modules/settings/clinic-access-settings";
import { RealSettingsView } from "@/components/modules/settings/real-settings-view";
import { getApplicationContext } from "@/lib/auth/application-context";
import { getPrismaClient } from "@/lib/db/client";
import { createPrismaReaders } from "@/domains/infrastructure/prisma/factory";
import { ClinicAccessManagementService } from "@/domains/infrastructure/prisma/clinic-access-management";
import { CommercialPlanQuotaReader } from "@/domains/infrastructure/prisma/commercial-plan-quota";
import { TeamService } from "@/domains/infrastructure/prisma/team-service";

export default async function ConfiguracoesPage() {
  const context = await getApplicationContext();
  const readers = createPrismaReaders(context);
  const teamService = new TeamService(context);
  const clinicAccessService = new ClinicAccessManagementService(context);
  const quotaReader = new CommercialPlanQuotaReader(context);
  const [
    organization,
    clinics,
    professionals,
    procedures,
    resources,
    workingHours,
    consents,
    team,
    clinicAccess,
    capacity,
    account,
  ] = await Promise.all([
    readers.organization.read(),
    readers.clinics.list({ limit: 100 }),
    readers.professionals.list({ limit: 100 }),
    readers.procedures.list({ limit: 100 }),
    readers.resources.list({ limit: 100 }),
    readers.workingHours.list({ limit: 100 }),
    readers.reports.read({
      from: new Date(Date.now() - 365 * 864e5).toISOString(),
      to: new Date().toISOString(),
    }),
    teamService.read(),
    clinicAccessService.read(),
    quotaReader.read(),
    getPrismaClient().user.findUniqueOrThrow({
      where: { id: context.userId },
      select: { emailNormalized: true, emailVerified: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <AccountEmailVerification
        email={account.emailNormalized}
        verified={account.emailVerified}
        tenantSlug={context.tenantSlug}
      />
      <RealSettingsView
        organization={organization}
        consentPatients={consents.consentPatients}
        revokedConsents={consents.revokedConsents}
        tenantSlug={context.tenantSlug}
        clinics={clinics.items}
        professionals={professionals.items}
        procedures={procedures.items}
        resources={resources.items}
        workingHours={workingHours.items}
        team={team}
        capacity={capacity}
      />
      {team && clinicAccess ? <ClinicAccessSettings data={clinicAccess} team={team} /> : null}
    </div>
  );
}
