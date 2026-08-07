import { readFileSync, writeFileSync } from "node:fs";

const path = "domains/pilot/scenario-runner.ts";
const source = readFileSync(path, "utf8");
const needle = "    email: membership.user.emailNormalized,\n  };";
const replacement = "    email: membership.user.emailNormalized,\n    clinicAccess: { mode: \"ALL\", clinicIds: [] },\n  };";

if (source.includes("clinicAccess: { mode: \"ALL\", clinicIds: [] }")) {
  console.log("Pilot context already patched.");
} else {
  if (!source.includes(needle)) throw new Error("Pilot context anchor not found");
  writeFileSync(path, source.replace(needle, replacement));
  console.log("Pilot owner context patched.");
}
