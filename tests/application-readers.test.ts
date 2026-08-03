import { describe, expect, it } from "vitest";
import { DemoAppointmentReader, DemoClinicReader, DemoProfessionalReader } from "@/domains/infrastructure/demo";
import { ApplicationError, normalizePage, parseDateRange } from "@/domains/application/query";

describe("application data contracts", () => {
  it("bounds pagination and rejects invalid date ranges", () => {
    expect(normalizePage({ offset: -2, limit: 999 })).toEqual({ offset: 0, limit: 100 });
    expect(() => parseDateRange({ from: "2026-09-20", to: "2026-09-10" })).toThrow(ApplicationError);
  });

  it("exposes the demo fixtures through the shared view models", async () => {
    const clinics = await new DemoClinicReader().list({ limit: 1 });
    const professionals = await new DemoProfessionalReader().list({ clinicId: "leste" });
    const appointments = await new DemoAppointmentReader().list({ range: { from: "2026-09-14T00:00:00.000Z", to: "2026-09-20T00:00:00.000Z" }, clinicId: "leste" });
    expect(clinics.items).toHaveLength(1);
    expect(clinics.page.hasMore).toBe(true);
    expect(professionals.items.every((item) => item.clinics.some((clinic) => clinic.id === "leste"))).toBe(true);
    expect(appointments.items.length).toBeGreaterThan(0);
    expect(appointments.items.every((item) => item.clinicId === "leste" && item.startsAt.endsWith("Z"))).toBe(true);
  });
});

