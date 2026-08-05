-- Bridge the transactional email persistence introduced in PR 43, whose
-- Prisma models were merged without a corresponding migration, and add the
-- EMAIL_VERIFICATION delivery kind required by PR 44.
--
-- The statements are intentionally additive so this migration can run both
-- on a clean migration replay and on an environment where the PR 43 objects
-- were provisioned separately.

DO $$
BEGIN
  CREATE TYPE "TransactionalEmailKind" AS ENUM (
    'PASSWORD_RESET',
    'EMAIL_VERIFICATION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TYPE "TransactionalEmailKind"
  ADD VALUE IF NOT EXISTS 'EMAIL_VERIFICATION';

DO $$
BEGIN
  CREATE TYPE "TransactionalEmailStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'DELIVERY_DELAYED',
    'BOUNCED',
    'COMPLAINED',
    'SUPPRESSED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "TransactionalEmailDelivery" (
  "id" UUID NOT NULL,
  "passwordResetTokenId" UUID,
  "kind" "TransactionalEmailKind" NOT NULL,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "recipientFingerprint" TEXT NOT NULL,
  "status" "TransactionalEmailStatus" NOT NULL DEFAULT 'PENDING',
  "failureCode" TEXT,
  "lastEventAt" TIMESTAMPTZ(3),
  "sentAt" TIMESTAMPTZ(3),
  "deliveredAt" TIMESTAMPTZ(3),
  "delayedAt" TIMESTAMPTZ(3),
  "bouncedAt" TIMESTAMPTZ(3),
  "complainedAt" TIMESTAMPTZ(3),
  "suppressedAt" TIMESTAMPTZ(3),
  "failedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "TransactionalEmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransactionalEmailWebhookEvent" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "eventOccurredAt" TIMESTAMPTZ(3),
  "processedAt" TIMESTAMPTZ(3),
  "failureCode" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransactionalEmailWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailSuppression" (
  "id" UUID NOT NULL,
  "recipientFingerprint" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "liftedAt" TIMESTAMPTZ(3),
  CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TransactionalEmailDelivery_passwordResetTokenId_key"
  ON "TransactionalEmailDelivery"("passwordResetTokenId");
CREATE UNIQUE INDEX IF NOT EXISTS "TransactionalEmailDelivery_providerMessageId_key"
  ON "TransactionalEmailDelivery"("providerMessageId");
CREATE UNIQUE INDEX IF NOT EXISTS "TransactionalEmailDelivery_idempotencyKey_key"
  ON "TransactionalEmailDelivery"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "TransactionalEmailDelivery_recipientFingerprint_status_idx"
  ON "TransactionalEmailDelivery"("recipientFingerprint", "status");
CREATE INDEX IF NOT EXISTS "TransactionalEmailDelivery_status_createdAt_idx"
  ON "TransactionalEmailDelivery"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "TransactionalEmailWebhookEvent_providerEventId_key"
  ON "TransactionalEmailWebhookEvent"("providerEventId");
CREATE INDEX IF NOT EXISTS "TransactionalEmailWebhookEvent_providerMessageId_eventOccurredAt_idx"
  ON "TransactionalEmailWebhookEvent"("providerMessageId", "eventOccurredAt");

CREATE UNIQUE INDEX IF NOT EXISTS "EmailSuppression_recipientFingerprint_provider_key"
  ON "EmailSuppression"("recipientFingerprint", "provider");
CREATE INDEX IF NOT EXISTS "EmailSuppression_provider_liftedAt_idx"
  ON "EmailSuppression"("provider", "liftedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TransactionalEmailDelivery_passwordResetTokenId_fkey'
      AND conrelid = '"TransactionalEmailDelivery"'::regclass
  ) THEN
    ALTER TABLE "TransactionalEmailDelivery"
      ADD CONSTRAINT "TransactionalEmailDelivery_passwordResetTokenId_fkey"
      FOREIGN KEY ("passwordResetTokenId")
      REFERENCES "PasswordResetToken"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;
