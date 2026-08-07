import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import { getPrismaClient } from "@/lib/db";

const TENANT_WIDE_ROLES = new Set<ApplicationContext["membershipRole"]>(["OWNER", "MANAGER"]);

export type ClinicAccessScope =
  | { tenantWide: true; clinicIds: null }
  | { tenantWide: false; clinicIds: string[] };

export function hasTenantWideClinicAccess(role: ApplicationContext["membershipRole"]) {
  return TENANT_WIDE_ROLES.has(role);
}

export async function resolveClinicAccessScope(
  context: ApplicationContext,
  prisma: PrismaClient = getPrismaClient(),
): Promise<ClinicAccessScope> {
  if (hasTenantWideClinicAccess(context.membershipRole)) {
    return { tenantWide: true, clinicIds: null };
  }

  const rows = await prisma.membershipClinicAccess.findMany({
    where: {
      tenantId: context.tenantId,
      membershipId: context.membershipId,
      active: true,
    },
    select: { clinicId: true },
    orderBy: { clinicId: "asc" },
  });

  return {
    tenantWide: false,
    clinicIds: rows.map((row) => row.clinicId),
  };
}

export async function canAccessClinic(
  context: ApplicationContext,
  clinicId: string,
  prisma: PrismaClient = getPrismaClient(),
) {
  if (hasTenantWideClinicAccess(context.membershipRole)) return true;
  const row = await prisma.membershipClinicAccess.findFirst({
    where: {
      tenantId: context.tenantId,
      membershipId: context.membershipId,
      clinicId,
      active: true,
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function requireClinicAccess(
  context: ApplicationContext,
  clinicId: string,
  prisma: PrismaClient = getPrismaClient(),
) {
  if (!(await canAccessClinic(context, clinicId, prisma))) {
    throw new Error("CLINIC_ACCESS_DENIED");
  }
}
