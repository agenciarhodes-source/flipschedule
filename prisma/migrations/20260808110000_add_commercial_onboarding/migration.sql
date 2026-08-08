-- CreateEnum
CREATE TYPE "CommercialOnboardingStatus" AS ENUM ('CREATED', 'CHECKOUT_ACTIVE', 'PAID', 'PROVISIONED', 'CANCELLED', 'EXPIRED', 'RECONCILIATION_REQUIRED', 'FAILED');

-- CreateTable
CREATE TABLE "CommercialOnboardingIntent" (
    "id" UUID NOT NULL,
    "commercialPlanId" UUID NOT NULL,
    "planCode" TEXT NOT NULL,
    "ownerEmailNormalized" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL DEFAULT 'ASAAS',
    "externalReference" TEXT NOT NULL,
    "externalCheckoutId" TEXT,
    "externalSubscriptionId" TEXT,
    "externalCustomerId" TEXT,
    "subscriptionStatus" "SubscriptionStatus",
    "billingType" TEXT,
    "providerStatus" TEXT,
    "externalPaymentId" TEXT,
    "paymentStatus" "PaymentStatus",
    "paymentAmountCents" INTEGER,
    "paymentDueAt" TIMESTAMPTZ(3),
    "paymentPaidAt" TIMESTAMPTZ(3),
    "amountCents" INTEGER NOT NULL,
    "cycle" "CommercialPlanCycle" NOT NULL,
    "status" "CommercialOnboardingStatus" NOT NULL DEFAULT 'CREATED',
    "correlationId" TEXT NOT NULL,
    "publicTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "paidAt" TIMESTAMPTZ(3),
    "provisionedAt" TIMESTAMPTZ(3),
    "tenantId" UUID,
    "accessSetupSentAt" TIMESTAMPTZ(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommercialOnboardingIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialOnboardingIntent_externalReference_key" ON "CommercialOnboardingIntent"("externalReference");
CREATE UNIQUE INDEX "CommercialOnboardingIntent_externalCheckoutId_key" ON "CommercialOnboardingIntent"("externalCheckoutId");
CREATE UNIQUE INDEX "CommercialOnboardingIntent_externalSubscriptionId_key" ON "CommercialOnboardingIntent"("externalSubscriptionId");
CREATE UNIQUE INDEX "CommercialOnboardingIntent_externalPaymentId_key" ON "CommercialOnboardingIntent"("externalPaymentId");
CREATE UNIQUE INDEX "CommercialOnboardingIntent_correlationId_key" ON "CommercialOnboardingIntent"("correlationId");
CREATE UNIQUE INDEX "CommercialOnboardingIntent_publicTokenHash_key" ON "CommercialOnboardingIntent"("publicTokenHash");
CREATE UNIQUE INDEX "CommercialOnboardingIntent_tenantId_key" ON "CommercialOnboardingIntent"("tenantId");
CREATE INDEX "CommercialOnboardingIntent_ownerEmailNormalized_status_idx" ON "CommercialOnboardingIntent"("ownerEmailNormalized", "status");
CREATE INDEX "CommercialOnboardingIntent_tenantSlug_status_idx" ON "CommercialOnboardingIntent"("tenantSlug", "status");
CREATE INDEX "CommercialOnboardingIntent_status_createdAt_idx" ON "CommercialOnboardingIntent"("status", "createdAt");
