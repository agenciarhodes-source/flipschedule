-- PR 35: additive operational hardening. This migration must be rehearsed and is never run by build.
-- Abort rather than silently resolving duplicates that would violate tenant-scoped identities.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Payment" WHERE "externalPaymentId" IS NOT NULL GROUP BY "tenantId","provider","externalPaymentId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate tenant/provider payment identities; reconcile explicitly before migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "Subscription" WHERE "externalSubscriptionId" IS NOT NULL GROUP BY "tenantId","provider","externalSubscriptionId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate tenant/provider subscription identities; reconcile explicitly before migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "BillingCheckout" GROUP BY "tenantId","provider","externalReference" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate tenant/provider checkout references; reconcile explicitly before migration';
  END IF;
END $$;

DROP INDEX IF EXISTS "Payment_provider_externalPaymentId_key";
DROP INDEX IF EXISTS "Subscription_provider_externalSubscriptionId_key";
DROP INDEX IF EXISTS "Subscription_externalReference_key";
DROP INDEX IF EXISTS "BillingCheckout_externalReference_key";
DROP INDEX IF EXISTS "BillingCheckout_externalCheckoutId_key";
CREATE UNIQUE INDEX "Payment_tenantId_provider_externalPaymentId_key" ON "Payment"("tenantId","provider","externalPaymentId");
CREATE UNIQUE INDEX "Subscription_tenantId_provider_externalSubscriptionId_key" ON "Subscription"("tenantId","provider","externalSubscriptionId");
CREATE UNIQUE INDEX "Subscription_tenantId_provider_externalReference_key" ON "Subscription"("tenantId","provider","externalReference");
CREATE UNIQUE INDEX "BillingCheckout_tenantId_provider_externalReference_key" ON "BillingCheckout"("tenantId","provider","externalReference");
CREATE UNIQUE INDEX "BillingCheckout_tenantId_provider_externalCheckoutId_key" ON "BillingCheckout"("tenantId","provider","externalCheckoutId");

CREATE TABLE "SecurityRateLimitBucket" (
  "id" UUID NOT NULL, "tenantId" UUID, "scope" TEXT NOT NULL, "keyHash" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMPTZ(3) NOT NULL, "count" INTEGER NOT NULL DEFAULT 0,
  "blockedUntil" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "SecurityRateLimitBucket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SecurityRateLimitBucket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SecurityRateLimitBucket_scope_keyHash_windowStartedAt_key" ON "SecurityRateLimitBucket"("scope","keyHash","windowStartedAt");
CREATE INDEX "SecurityRateLimitBucket_blockedUntil_idx" ON "SecurityRateLimitBucket"("blockedUntil");
CREATE INDEX "SecurityRateLimitBucket_tenantId_scope_updatedAt_idx" ON "SecurityRateLimitBucket"("tenantId","scope","updatedAt");
