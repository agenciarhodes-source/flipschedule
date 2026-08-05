-- CreateEnum
CREATE TYPE "CommercialPlanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommercialPlanCycle" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "CommercialPlan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CommercialPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "cycle" "CommercialPlanCycle" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "maxClinics" INTEGER,
    "maxUsers" INTEGER,
    "features" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommercialPlan_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "commercialPlanId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "CommercialPlan_code_key" ON "CommercialPlan"("code");

-- CreateIndex
CREATE INDEX "CommercialPlan_status_priceCents_idx" ON "CommercialPlan"("status", "priceCents");

-- CreateIndex
CREATE INDEX "Subscription_commercialPlanId_status_idx" ON "Subscription"("commercialPlanId", "status");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_commercialPlanId_fkey" FOREIGN KEY ("commercialPlanId") REFERENCES "CommercialPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
