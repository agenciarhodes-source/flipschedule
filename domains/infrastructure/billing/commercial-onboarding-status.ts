import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { hashCommercialOnboardingPublicToken } from "./commercial-onboarding-service";

export async function readCommercialOnboardingPublicStatus(
  prisma: PrismaClient,
  token: string,
) {
  if (!token.startsWith("onb_") || token.length > 256) return null;
  const row = await prisma.commercialOnboardingIntent.findUnique({
    where: { publicTokenHash: hashCommercialOnboardingPublicToken(token) },
    select: {
      status: true,
      tenantSlug: true,
      accessSetupSentAt: true,
      lastErrorCode: true,
    },
  });
  if (!row) return null;
  return {
    status: row.status,
    ready: row.status === "PROVISIONED",
    accessSetupSent: Boolean(row.accessSetupSentAt),
    needsSupport: row.status === "PAID" && Boolean(row.lastErrorCode),
    ...(row.status === "PROVISIONED" ? { tenantSlug: row.tenantSlug } : {}),
  };
}
