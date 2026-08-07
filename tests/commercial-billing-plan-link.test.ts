import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

import {
  findCommercialPlanLink,
  requireCommercialPlanLink,
} from "@/domains/infrastructure/billing/commercial-plan-link";

describe("commercial billing plan link", () => {
  it("resolves the canonical commercial plan by exact code", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "plan-1", code: "PRO" });
    const db = { commercialPlan: { findUnique } } as unknown as PrismaClient;

    await expect(findCommercialPlanLink(db, "PRO")).resolves.toEqual({
      id: "plan-1",
      code: "PRO",
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { code: "PRO" },
      select: { id: true, code: true },
    });
  });

  it("fails closed for a new provider subscription with an unknown plan", async () => {
    const db = {
      commercialPlan: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;

    await expect(requireCommercialPlanLink(db, "UNKNOWN")).rejects.toMatchObject({
      code: "COMMERCIAL_PLAN_UNRESOLVED",
      message: "COMMERCIAL_PLAN_UNRESOLVED",
    });
    await expect(findCommercialPlanLink(db, "UNKNOWN")).resolves.toBeNull();
  });

  it("binds newly materialized Asaas subscriptions before quota enforcement", () => {
    const runtime = readFileSync(
      "domains/infrastructure/integrations/async-runtime.ts",
      "utf8",
    );
    const quota = readFileSync(
      "domains/infrastructure/prisma/commercial-plan-quota.ts",
      "utf8",
    );

    expect(runtime).toContain("requireCommercialPlanLink(tx,checkout.planCode)");
    expect(runtime).toContain("commercialPlanId:commercialPlan.id");
    expect(runtime).toContain("planCode:checkout.planCode");
    expect(quota).toContain("commercialPlanId: { not: null }");
  });

  it("repairs matching legacy subscriptions without overwriting an existing link", () => {
    const runtime = readFileSync(
      "domains/infrastructure/integrations/async-runtime.ts",
      "utf8",
    );
    const reconciliation = readFileSync(
      "domains/infrastructure/billing/reconciliation-service.ts",
      "utf8",
    );

    expect(runtime).toContain(
      "existing.commercialPlanId?null:await findCommercialPlanLink(tx,existing.planCode)",
    );
    expect(reconciliation).toContain(
      "local.commercialPlanId?null:await findCommercialPlanLink(this.prisma,local.planCode)",
    );
    expect(reconciliation).toContain("...(commercialPlan?{commercialPlanId:commercialPlan.id}:{})");
  });

  it("leaves an auditable trace when reconciliation repairs a plan link", () => {
    const reconciliation = readFileSync(
      "domains/infrastructure/billing/reconciliation-service.ts",
      "utf8",
    );
    const worker = readFileSync("scripts/reconcile-billing.ts", "utf8");

    expect(reconciliation).toContain("platform.billing.commercial_plan_linked");
    expect(reconciliation).toContain("metadata:{planCode:local.planCode,commercialPlanId:commercialPlan.id}");
    expect(worker).toContain("new AsaasBillingReconciliationService");
    expect(worker).toContain('provider:"ASAAS"');
  });
});
