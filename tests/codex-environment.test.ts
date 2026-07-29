import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(__dirname, "..");
const readText = (relativePath: string) => readFileSync(path.join(rootDir, relativePath), "utf8");

describe("Codex environment stabilization", () => {
  it("replaces next/font/google with local @fontsource imports", () => {
    const layout = readText("app/layout.tsx");

    expect(layout).not.toContain("next/font/google");
    expect(layout).toContain("@fontsource/instrument-serif/400.css");
    expect(layout).toContain("@fontsource/ibm-plex-sans/400.css");
    expect(layout).toContain("@fontsource/ibm-plex-sans/600.css");
    expect(layout).toContain("@fontsource/ibm-plex-mono/400.css");
    expect(layout).toContain("@fontsource/ibm-plex-mono/500.css");

    const globals = readText("app/globals.css");
    expect(globals).toContain('--font-display: "Instrument Serif";');
    expect(globals).toContain('--font-sans: "IBM Plex Sans";');
    expect(globals).toContain('--font-mono: "IBM Plex Mono";');
  });

  it("provides a reproducible Codex setup and documentation", () => {
    expect(existsSync(path.join(rootDir, "scripts/codex-setup.sh"))).toBe(true);
    expect(existsSync(path.join(rootDir, "docs/CODEX_WORKFLOW.md"))).toBe(true);

    const script = readText("scripts/codex-setup.sh");
    expect(script).toContain("pnpm install --frozen-lockfile");
    expect(script).toContain("pnpm db:generate");
    expect(script).not.toMatch(/prisma\s+migrate|prisma\s+db\s+push|pnpm\s+migrate|npm\s+run\s+migrate|db push|migration/i);

    const agents = readText("AGENTS.md");
    expect(agents).toContain("## Protocolo para Codex Cloud");
    expect(agents).toContain("branch local chamada `work`");
  });
});
