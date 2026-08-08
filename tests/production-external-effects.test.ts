import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getExternalEffectsMode } from "@/lib/runtime/config";
import {
  assertExternalEffectAllowed,
  getProductionExternalEffectScopes,
} from "@/lib/runtime/external-effects";

describe("production external effects isolation", () => {
  it("keeps production mode valid only inside the production runtime", () => {
    expect(
      getExternalEffectsMode({ APP_ENV: "production", EXTERNAL_EFFECTS_MODE: "PRODUCTION" }),
    ).toBe("PRODUCTION");
    expect(() =>
      getExternalEffectsMode({ APP_ENV: "staging", EXTERNAL_EFFECTS_MODE: "PRODUCTION" }),
    ).toThrow("A configuração operacional não está disponível");
    expect(() =>
      getExternalEffectsMode({ APP_ENV: "test", EXTERNAL_EFFECTS_MODE: "PRODUCTION" }),
    ).toThrow("A configuração operacional não está disponível");
  });

  it("keeps sandbox mode out of the production runtime", () => {
    expect(
      getExternalEffectsMode({ APP_ENV: "staging", EXTERNAL_EFFECTS_MODE: "SANDBOX" }),
    ).toBe("SANDBOX");
    expect(() =>
      getExternalEffectsMode({ APP_ENV: "production", EXTERNAL_EFFECTS_MODE: "SANDBOX" }),
    ).toThrow("A configuração operacional não está disponível");
  });

  it("requires provider environment, runtime mode and production scope to agree", () => {
    const production = {
      APP_ENV: "production",
      EXTERNAL_EFFECTS_MODE: "PRODUCTION",
      EXTERNAL_EFFECTS_PRODUCTION_SCOPES: "ASAAS_BILLING",
    };
    expect(getProductionExternalEffectScopes(production)).toEqual(new Set(["ASAAS_BILLING"]));
    expect(() => assertExternalEffectAllowed("production", production, "ASAAS_BILLING")).not.toThrow();
    expect(() => assertExternalEffectAllowed("production", production)).toThrow(
      "Operação externa indisponível",
    );
    expect(() => assertExternalEffectAllowed("production", production, "OTHER_PROVIDER")).toThrow(
      "Operação externa indisponível",
    );
    expect(() =>
      assertExternalEffectAllowed("sandbox", {
        APP_ENV: "staging",
        EXTERNAL_EFFECTS_MODE: "SANDBOX",
      }),
    ).not.toThrow();
    expect(() =>
      assertExternalEffectAllowed("production", {
        ...production,
        EXTERNAL_EFFECTS_MODE: "DISABLED",
      }, "ASAAS_BILLING"),
    ).toThrow("Operação externa indisponível");
    expect(() => assertExternalEffectAllowed("sandbox", production)).toThrow(
      "Operação externa indisponível",
    );
  });
});
