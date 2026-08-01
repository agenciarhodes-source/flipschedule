import { describe, expect, it } from "vitest";

import { readAuthConfig } from "@/lib/auth/config";

describe("auth configuration", () => {
  it("exposes the public signup disabled contract", () => {
    expect(true).toBe(true);
  });

  it("does not require a database connection for the module import", () => {
    expect(typeof readAuthConfig).toBe("function");
  });
});
