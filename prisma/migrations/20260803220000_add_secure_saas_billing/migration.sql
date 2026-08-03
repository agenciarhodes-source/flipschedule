-- Additive SaaS billing state. This migration must be reviewed and deployed separately.
CREATE TYPE "BillingCheckoutStatus" AS ENUM ('CREATED', 'ACTIVE', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED');

ALTER TABLE "Subscription"
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "billingType" TEXT,
  ADD COLUMN "gracePeriodEndsAt" TIMESTAMPTZ(3),
  ADD COLUMN "lastSyncedAt" TIMESTAMPTZ(3),
  ADD COLUMN "externalReference" TEXT;
ALTER TABLE "Payment"
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "lastSyncedAt" TIMESTAMPTZ(3),
  ADD COLUMN "correlationId" TEXT;

CREATE TABLE "BillingCheckout" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "planCode" TEXT NOT NULL,
  "externalReference" TEXT NOT NULL,
  "externalCheckoutId" TEXT,
  "status" "BillingCheckoutStatus" NOT NULL DEFAULT 'CREATED',
  "amountCents" INTEGER NOT NULL,
  "cycle" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "cancelledAt" TIMESTAMPTZ(3),
  "createdByMembershipId" UUID NOT NULL,
  "correlationId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingCheckout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_externalReference_key" ON "Subscription"("externalReference");
CREATE UNIQUE INDEX "BillingCheckout_externalReference_key" ON "BillingCheckout"("externalReference");
CREATE UNIQUE INDEX "BillingCheckout_externalCheckoutId_key" ON "BillingCheckout"("externalCheckoutId");
CREATE UNIQUE INDEX "BillingCheckout_id_tenantId_key" ON "BillingCheckout"("id", "tenantId");
CREATE INDEX "BillingCheckout_tenantId_status_createdAt_idx" ON "BillingCheckout"("tenantId", "status", "createdAt");
-- PostgreSQL partial uniqueness preserves history while preventing two operational subscriptions.
CREATE UNIQUE INDEX "Subscription_one_operational_per_tenant"
  ON "Subscription"("tenantId")
  WHERE "status" IN ('PENDING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_createdByMembershipId_fkey" FOREIGN KEY ("createdByMembershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
