import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ASAAS_PRODUCTION_CONFIRMATION,
  ASAAS_PRODUCTION_EXTERNAL_EFFECT_SCOPE,
} from "@/domains/infrastructure/billing/asaas-runtime";
import { runAsaasProductionBillingPreflight } from "@/scripts/ops-asaas-production-preflight";

const readyEnv = {
  APP_ENV: "production",
  ASAAS_ENVIRONMENT: "production",
  ASAAS_API_KEY: "p".repeat(32),
  ASAAS_CHECKOUT_EXPIRATION_MINUTES: "90",
  ASAAS_WEBHOOK_TOKEN: "w".repeat(32),
  EXTERNAL_EFFECTS_MODE: "PRODUCTION",
  EXTERNAL_EFFECTS_PRODUCTION_SCOPES: ASAAS_PRODUCTION_EXTERNAL_EFFECT_SCOPE,
  NEXT_PUBLIC_APP_URL: "https://app.flipschedule.com.br",
  PRODUCTION_HOSTNAME: "app.flipschedule.com.br",
  ASAAS_PRODUCTION_BILLING_ENABLED: "true",
  ASAAS_PRODUCTION_CONFIRMATION,
  ASAAS_PRODUCTION_TENANT_SLUGS: "pilot-clinic",
};

describe("Asaas production billing preflight", () => {
  it("reports safe readiness without executing a provider request", () => {
    const result = runAsaasProductionBillingPreflight(readyEnv);
    expect(result).toMatchObject({
      ready: true,
      issues: [],
      runtimeEnvironment: "production",
      providerEnvironment: "production",
      externalEffectsMode: "PRODUCTION",
      productionScopeEnabled: true,
      billingEnabled: true,
      tenantAllowlistCount: 1,
      checkoutExpirationMinutes: 90,
      apiKeyConfigured: true,
      webhookTokenConfigured: true,
    });
    const output = JSON.stringify(result);
    expect(output).not.toContain(readyEnv.ASAAS_API_KEY);
    expect(output).not.toContain(readyEnv.ASAAS_WEBHOOK_TOKEN);
    expect(output).not.toContain(ASAAS_PRODUCTION_CONFIRMATION);
  });

  it("fails closed and returns actionable issue codes while rollout gates are incomplete", () => {
    const result = runAsaasProductionBillingPreflight({
      ...readyEnv,
      ASAAS_PRODUCTION_BILLING_ENABLED: "false",
      ASAAS_PRODUCTION_TENANT_SLUGS: "",
      EXTERNAL_EFFECTS_PRODUCTION_SCOPES: "",
    });
    expect(result.ready).toBe(false);
    expect(result.issues).toContain("ASAAS_PRODUCTION_BILLING_DISABLED");
    expect(result.issues).toContain("ASAAS_PRODUCTION_TENANT_ALLOWLIST_INVALID");
    expect(result.issues).toContain("ASAAS_PRODUCTION_EXTERNAL_EFFECT_SCOPE_REQUIRED");
  });

  it("exposes the preflight command without embedding production credentials", () => {
    const packageJson = readFileSync("package.json", "utf8");
    const envExample = readFileSync(".env.example", "utf8");
    expect(packageJson).toContain("ops:asaas-production-preflight");
    expect(envExample).toContain("ASAAS_PRODUCTION_BILLING_ENABLED=false");
    expect(envExample).toContain("ASAAS_PRODUCTION_CONFIRMATION=");
    expect(envExample).toContain("ASAAS_PRODUCTION_TENANT_SLUGS=");
    expect(envExample).toContain("EXTERNAL_EFFECTS_PRODUCTION_SCOPES=");
    expect(envExample).not.toContain("pppppppppppppppppppppppppppppppp");
  });
});
