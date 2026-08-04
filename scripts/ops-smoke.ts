import { appendFileSync } from "node:fs";

const privateHost = (hostname: string) =>
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);

export function validateSmokeTarget(raw: string, allowed: string, production?: string) {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.port && url.port !== "443") ||
    url.hostname !== allowed ||
    url.hostname === production ||
    privateHost(url.hostname)
  ) {
    throw new Error("SMOKE_TARGET_DENIED");
  }
  return url;
}

export function validateRootRedirect(
  base: URL,
  location: string | null,
  production?: string,
) {
  if (!location) throw new Error("SMOKE_REDIRECT_LOCATION_REQUIRED");
  const target = new URL(location, base);
  const port = (url: URL) => url.port || (url.protocol === "https:" ? "443" : "80");
  if (
    target.protocol !== base.protocol ||
    target.hostname !== base.hostname ||
    port(target) !== port(base) ||
    target.pathname !== "/login" ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    target.hostname === production
  ) {
    throw new Error("SMOKE_REDIRECT_DENIED");
  }
  return target;
}

function validateSecurityHeaders(response: Response) {
  if (!response.headers.get("x-robots-tag")?.includes("noindex")) {
    throw new Error("SMOKE_NOINDEX_MISSING");
  }
  for (const header of [
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "cache-control",
  ]) {
    if (!response.headers.has(header)) throw new Error("SMOKE_HEADER_MISSING");
  }
}

export async function runSmoke(
  base: URL,
  fetcher: typeof fetch = fetch,
  production?: string,
) {
  const evidence: Record<string, boolean | number | string> = { hostname: base.hostname };
  for (const path of ["/api/health/live", "/api/health/ready", "/login", "/"]) {
    const response = await fetcher(new URL(path, base), {
      redirect: "manual",
      headers: { "user-agent": "FlipSchedule controlled smoke" },
    });

    validateSecurityHeaders(response);

    if (path === "/" && [307, 308].includes(response.status)) {
      validateRootRedirect(base, response.headers.get("location"), production);
      evidence[path] = response.status;
      continue;
    }
    if ([301, 302, 307, 308].includes(response.status)) {
      throw new Error("SMOKE_REDIRECT_DENIED");
    }
    if (!response.ok) throw new Error("SMOKE_HTTP_FAILED");

    if (path.includes("health")) {
      const body = (await response.json()) as { status?: string };
      if (body.status !== (path.endsWith("live") ? "ok" : "ready")) {
        throw new Error("SMOKE_HEALTH_FAILED");
      }
    } else {
      const body = await response.text();
      if (path === "/login" && !body.includes("AMBIENTE DE HOMOLOGAÇÃO")) {
        throw new Error("SMOKE_BANNER_MISSING");
      }
    }
    evidence[path] = response.status;
  }
  return evidence;
}

async function main() {
  const base = validateSmokeTarget(
    process.env.BASE_URL ?? "",
    process.env.STAGING_ALLOWED_HOSTNAME ?? "",
    process.env.PRODUCTION_HOSTNAME,
  );
  const result = await runSmoke(base, fetch, process.env.PRODUCTION_HOSTNAME);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Smoke técnico de staging\n- Host: \`${base.hostname}\`\n- Horário: ${new Date().toISOString()}\n- Endpoints, noindex, banner e headers: válidos\n- Staging não foi aprovado automaticamente.\n`,
    );
  }
  console.info(JSON.stringify(result));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    console.error("Smoke controlado falhou.");
    process.exitCode = 1;
  });
}
