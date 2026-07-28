import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
const models = [...schema.matchAll(/^model\s+(\w+)/gm)].map((match) => match[1]);
const required = ["User", "Tenant", "Clinic", "Membership", "AccessEntitlement", "Professional", "ProfessionalClinic", "Resource", "Procedure", "WorkingHours", "ScheduleBlock", "Patient", "Consent", "Pipeline", "PipelineStage", "Lead", "LeadStageHistory", "PatientAttribution", "Appointment", "AppointmentStatusHistory", "TreatmentPlan", "TreatmentPlanItem", "TreatmentPlanStatusHistory", "Conversation", "Message", "Integration", "Subscription", "Payment", "WebhookEvent", "AuditLog"];
const tenantScoped = required.filter((name) => !["User", "Tenant", "WebhookEvent", "AuditLog"].includes(name));
const block = (name: string) => schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";

const phase2cDocs = ["../../docs/PHASE_2A_SCHEMA_REPORT.md", "../../docs/DATABASE_CONVENTIONS.md", "../../docs/PHASE_2A_REVIEW_CHECKLIST.md", "../../docs/decisions/ADR-0006-initial-relational-model.md"].map((path) => readFileSync(resolve("tests/database", path), "utf8"));

describe("Prisma schema contract", () => {
  it("contains every required model", () => expect(models).toEqual(expect.arrayContaining(required)));
  it.each(tenantScoped)("keeps required tenantId on %s", (name) => expect(block(name)).toMatch(/tenantId\s+String\s+@db\.Uuid/));
  it("uses safe financial and identity fields", () => {
    expect(schema).not.toMatch(/\w+Cents\s+(Float|Decimal)/);
    expect(schema).not.toMatch(/^\s*cpf\s+/m);
    expect(schema).not.toMatch(/^\s*publicToken\s+/m);
    expect(block("TreatmentPlan")).toContain("publicTokenHash");
  });
  it("keeps commercial entitlement separate from subscription", () => {
    expect(models).toContain("AccessEntitlement");
    expect(models).toContain("Subscription");
    expect(block("AccessEntitlement")).not.toContain("subscriptionId");
  });
  it("keeps multi-clinic professionals and configurable pipelines", () => {
    expect(models).toContain("ProfessionalClinic");
    expect(models).toEqual(expect.arrayContaining(["Pipeline", "PipelineStage"]));
  });
  it("does not reuse tenantId in overlapping Prisma relations", () => {
    expect(schema).not.toMatch(/@relation\([^\n]*fields:\s*\[[^\]]*tenantId[^\]]*,[^\]]*\]/);
    expect(schema).not.toMatch(/@relation\([^\n]*fields:\s*\[[^\]]*,[^\]]*tenantId[^\]]*\]/);
  });
  it("documents composite tenant foreign keys and cross-tenant tests for phase 2C", () => {
    for (const document of phase2cDocs) {
      expect(document).toMatch(/foreign keys compostas/i);
      expect(document).toMatch(/2C/i);
      expect(document).toMatch(/cross-tenant/i);
    }
  });
});
