import { readFileSync, writeFileSync, existsSync } from "node:fs";

const path = "prisma/schema.prisma";
const source = readFileSync(path, "utf8");
let next = source;

const membershipNeedle = "  status                  MembershipStatus             @default(INVITED)\n  invitedAt";
const membershipReplacement = "  status                  MembershipStatus             @default(INVITED)\n  clinicAccess            Json?\n  invitedAt";

const invitationNeedle = "  role                  MembershipRole\n  tokenHash";
const invitationReplacement = "  role                  MembershipRole\n  clinicAccess          Json?\n  tokenHash";

if (!next.includes("clinicAccess            Json?")) {
  if (!next.includes(membershipNeedle)) throw new Error("Membership schema anchor not found");
  next = next.replace(membershipNeedle, membershipReplacement);
}

if (!next.includes("clinicAccess          Json?")) {
  if (!next.includes(invitationNeedle)) throw new Error("TenantInvitation schema anchor not found");
  next = next.replace(invitationNeedle, invitationReplacement);
}

if (next === source) {
  console.log("Clinic access schema already applied.");
} else {
  writeFileSync(path, next);
  console.log("Clinic access schema applied.");
}

if (!existsSync(path)) throw new Error("Schema file missing after patch");
