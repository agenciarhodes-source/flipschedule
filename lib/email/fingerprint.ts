import "server-only";

import { createHmac } from "node:crypto";

import { normalizeEmail } from "@/lib/auth/utils";

export function fingerprintEmailAddress(email: string, key: string) {
  return createHmac("sha256", key).update(normalizeEmail(email), "utf8").digest("hex");
}
