-- Null preserves the legacy meaning: access to all clinics in the tenant.
ALTER TABLE "Membership"
ADD COLUMN "clinicAccess" JSONB;

-- Invitations carry the same scope so access is preserved when accepted.
ALTER TABLE "TenantInvitation"
ADD COLUMN "clinicAccess" JSONB;
