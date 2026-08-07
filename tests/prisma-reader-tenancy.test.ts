import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Prisma reader tenant isolation", () => {
  const source = readFileSync("domains/infrastructure/prisma/readers.ts", "utf8");

  it("derives every adapter scope from trusted application context", () => {
    expect(source.match(/tenantId: this\.context\.tenantId/g)?.length).toBeGreaterThanOrEqual(12);
    expect(source).not.toMatch(/tenantId:\s*(query|input|form)/);
  });

  it("keeps infrastructure server-only and scopes ID lookups", () => {
    expect(source.startsWith('import "server-only";')).toBe(true);
    for (const model of ["clinic", "professional", "procedure", "resource", "appointment"]) {
      expect(source).toContain(`this.prisma.${model}.findFirst`);
    }
    expect(source).toContain("resolveClinicAccessScope");
    expect(source).toContain("tenantId: this.context.tenantId");
    expect(source).toContain("clinicId:{in:clinicIds}");
  });
});
