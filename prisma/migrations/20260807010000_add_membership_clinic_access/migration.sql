CREATE TABLE "MembershipClinicAccess" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "clinicId" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipClinicAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MembershipClinicAccess_membershipId_clinicId_key"
  ON "MembershipClinicAccess"("membershipId", "clinicId");
CREATE INDEX "MembershipClinicAccess_tenantId_membershipId_active_idx"
  ON "MembershipClinicAccess"("tenantId", "membershipId", "active");
CREATE INDEX "MembershipClinicAccess_tenantId_clinicId_active_idx"
  ON "MembershipClinicAccess"("tenantId", "clinicId", "active");

CREATE TABLE "TenantInvitationClinicAccess" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "invitationId" UUID NOT NULL,
  "clinicId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantInvitationClinicAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantInvitationClinicAccess_invitationId_clinicId_key"
  ON "TenantInvitationClinicAccess"("invitationId", "clinicId");
CREATE INDEX "TenantInvitationClinicAccess_tenantId_invitationId_idx"
  ON "TenantInvitationClinicAccess"("tenantId", "invitationId");
CREATE INDEX "TenantInvitationClinicAccess_tenantId_clinicId_idx"
  ON "TenantInvitationClinicAccess"("tenantId", "clinicId");

-- Preserve the access users already have before clinic scoping becomes enforceable.
-- Owners/managers do not depend on these rows, but backfilling every active membership
-- makes later role changes safe and prevents accidental lockout during rollout.
INSERT INTO "MembershipClinicAccess" (
  "id", "tenantId", "membershipId", "clinicId", "active", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  m."tenantId",
  m."id",
  c."id",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Membership" m
JOIN "Clinic" c ON c."tenantId" = m."tenantId"
WHERE m."status" = 'ACTIVE'
  AND c."status" = 'ACTIVE'
ON CONFLICT ("membershipId", "clinicId") DO NOTHING;

-- Pending invitations created before clinic scoping keep the former tenant-wide
-- experience on first acceptance. New invitations capture an explicit unit list.
INSERT INTO "TenantInvitationClinicAccess" (
  "id", "tenantId", "invitationId", "clinicId", "createdAt"
)
SELECT
  gen_random_uuid(),
  i."tenantId",
  i."id",
  c."id",
  CURRENT_TIMESTAMP
FROM "TenantInvitation" i
JOIN "Clinic" c ON c."tenantId" = i."tenantId"
WHERE i."acceptedAt" IS NULL
  AND i."revokedAt" IS NULL
  AND i."expiresAt" > CURRENT_TIMESTAMP
  AND c."status" = 'ACTIVE'
ON CONFLICT ("invitationId", "clinicId") DO NOTHING;
