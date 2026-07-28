import { describe, expect, it, vi } from "vitest";
import { DatabaseConfigurationError } from "@/lib/db/errors";
import { readDatabaseEnv } from "@/lib/db/env";

describe("database environment", () => {
 it("accepts a pooled PostgreSQL URL", () => expect(readDatabaseEnv({ DATABASE_URL: "postgresql://user:secret@pool.example.invalid/db?sslmode=require" }).databaseUrl).toContain("pool.example.invalid"));
 it.each([undefined, ""])("rejects an absent or empty URL", (DATABASE_URL) => expect(() => readDatabaseEnv({ DATABASE_URL })).toThrow(DatabaseConfigurationError));
 it("rejects another protocol without leaking the secret", () => {
   const secret = "do-not-print";
   let message = "";
   try { readDatabaseEnv({ DATABASE_URL: `https://example.invalid/${secret}` }); } catch (error) { message = String(error); }
   expect(message).not.toContain(secret);
 });
 it("has no connection side effect when imported", async () => {
   const fetchSpy = vi.spyOn(globalThis, "fetch");
   await import("@/lib/db/env");
   expect(fetchSpy).not.toHaveBeenCalled();
   fetchSpy.mockRestore();
 });
});
