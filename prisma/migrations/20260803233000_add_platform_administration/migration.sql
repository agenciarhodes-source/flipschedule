-- Additive platform administration and tenant-safe billing checkout creator relation.
CREATE TYPE "PlatformOperatorRole" AS ENUM ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'SUPPORT', 'BILLING', 'READONLY');
CREATE TYPE "PlatformOperatorStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

ALTER TABLE "BillingCheckout" DROP CONSTRAINT IF EXISTS "BillingCheckout_createdByMembershipId_fkey";
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_createdByMembershipId_tenantId_fkey"
  FOREIGN KEY ("createdByMembershipId", "tenantId") REFERENCES "Membership"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PlatformOperator" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "PlatformOperatorRole" NOT NULL,
  "status" "PlatformOperatorStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PlatformOperator_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformOperator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PlatformOperator_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PlatformOperator_userId_key" ON "PlatformOperator"("userId");
CREATE INDEX "PlatformOperator_status_role_idx" ON "PlatformOperator"("status", "role");

CREATE TABLE "PlatformSupportGrant" (
  "id" UUID NOT NULL,
  "operatorId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "revokedAt" TIMESTAMPTZ(3),
  "createdByOperatorId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PlatformSupportGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformSupportGrant_reason_nonempty" CHECK (length(btrim("reason")) > 0),
  CONSTRAINT "PlatformSupportGrant_temporary" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "PlatformSupportGrant_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "PlatformOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PlatformSupportGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PlatformSupportGrant_createdByOperatorId_fkey" FOREIGN KEY ("createdByOperatorId") REFERENCES "PlatformOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PlatformSupportGrant_operatorId_tenantId_expiresAt_idx" ON "PlatformSupportGrant"("operatorId", "tenantId", "expiresAt");
CREATE INDEX "PlatformSupportGrant_tenantId_revokedAt_expiresAt_idx" ON "PlatformSupportGrant"("tenantId", "revokedAt", "expiresAt");
