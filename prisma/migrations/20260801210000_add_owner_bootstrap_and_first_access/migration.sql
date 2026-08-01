-- First-access state is identity metadata; credential hashes remain in AuthAccount.
ALTER TABLE "User"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordChangedAt" TIMESTAMPTZ(3),
  ADD COLUMN "firstAccessCompletedAt" TIMESTAMPTZ(3);
