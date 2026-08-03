-- Additive queue state for bounded, atomically claimed message and webhook processing.
ALTER TYPE "MessageStatus" ADD VALUE IF NOT EXISTS 'PROCESSING' AFTER 'PENDING';

ALTER TABLE "Message"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextAttemptAt" TIMESTAMPTZ(3),
  ADD COLUMN "processingStartedAt" TIMESTAMPTZ(3),
  ADD COLUMN "lastErrorCode" TEXT,
  ADD COLUMN "correlationId" TEXT;

ALTER TABLE "WebhookEvent"
  ADD COLUMN "processingStartedAt" TIMESTAMPTZ(3),
  ADD COLUMN "correlationId" TEXT;

CREATE INDEX "Message_status_nextAttemptAt_idx" ON "Message"("status", "nextAttemptAt");
CREATE INDEX "Message_tenantId_direction_status_nextAttemptAt_idx" ON "Message"("tenantId", "direction", "status", "nextAttemptAt");
CREATE INDEX "Integration_tenantId_status_idx" ON "Integration"("tenantId", "status");
