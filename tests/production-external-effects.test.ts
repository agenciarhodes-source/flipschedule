import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getExternalEffectsMode } from "@/lib/runtime/config";
import { assertExternalEffectAllowed } from "@/lib/runtime/external-effects";

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

  it("requires provider environment and runtime mode to agree", () => {
    expect(() =>
      assertExternalEffectAllowed("production", {
        APP_ENV: "production",
        EXTERNAL_EFFECTS_MODE: "PRODUCTION",
      }),
    ).not.toThrow();
    expect(() =>
      assertExternalEffectAllowed("sandbox", {
        APP_ENV: "staging",
        EXTERNAL_EFFECTS_MODE: "SANDBOX",
      }),
    ).not.toThrow();
    expect(() =>
      assertExternalEffectAllowed("production", {
        APP_ENV: "production",
        EXTERNAL_EFFECTS_MODE: "DISABLED",
      }),
    ).toThrow("Operação externa indisponível");
    expect(() =>
      assertExternalEffectAllowed("sandbox", {
        APP_ENV: "production",
        EXTERNAL_EFFECTS_MODE: "PRODUCTION",
      }),
    ).toThrow("Operação externa indisponível");
  });
});
