import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
const models = [...schema.matchAll(/^model\s+(\w+)/gm)].map((match) => match[1]);
const required = ["User","Tenant","Clinic","Membership","AccessEntitlement","Professional","ProfessionalClinic","Resource","Procedure","WorkingHours","ScheduleBlock","Patient","Consent","Pipeline","PipelineStage","Lead","LeadStageHistory","PatientAttribution","Appointment","AppointmentStatusHistory","TreatmentPlan","TreatmentPlanItem","TreatmentPlanStatusHistory","Conversation","Message","Integration","Subscription","Payment","WebhookEvent","AuditLog"];
const block = (name: string) => schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";

describe("Prisma schema contract", () => {
 it("contains every required model", () => expect(models).toEqual(expect.arrayContaining(required)));
 it("uses safe financial and identity fields", () => {
   expect(schema).not.toMatch(/\w+Cents\s+(Float|Decimal)/);
   expect(schema).not.toMatch(/^\s*cpf\s+/m);
   expect(schema).not.toMatch(/^\s*publicToken\s+/m);
   expect(block("TreatmentPlan")).toContain("publicTokenHash");
 });
 it.each(["Patient","Appointment","TreatmentPlan","Conversation","Message"])("scopes %s by tenant", (name) => expect(block(name)).toMatch(/tenantId\s+String/));
 it("defines webhook idempotency", () => expect(block("WebhookEvent")).toMatch(/@@unique\(\[provider,\s*externalEventId\]\)/));
 it("uses composite tenant-safe critical relations", () => {
   expect(block("Appointment")).toMatch(/fields:\s*\[patientId,\s*tenantId\]/);
   expect(block("Appointment")).toMatch(/fields:\s*\[tenantId,\s*professionalId,\s*clinicId\]/);
   expect(block("TreatmentPlanItem")).toMatch(/fields:\s*\[treatmentPlanId,\s*tenantId\]/);
   expect(block("Message")).toMatch(/fields:\s*\[conversationId,\s*tenantId\]/);
 });
});
