import { getPublicApplicationOrigin, isProductionRuntime } from "@/lib/runtime/config";

export type SecurityHeaderContext = {
  secureTransport?: boolean;
};

export function securityHeaders(
  env: Record<string, string | undefined> = process.env,
  context: SecurityHeaderContext = {},
) {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy":
      "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  };

  let secureTransport = context.secureTransport;
  if (secureTransport === undefined) {
    try {
      secureTransport = isProductionRuntime(env) && getPublicApplicationOrigin(env).protocol === "https:";
    } catch {
      secureTransport = false;
    }
  }

  if (secureTransport) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }

  return headers;
}

export function assertSameOrigin(request: Request, env: Record<string, string | undefined> = process.env) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) throw new Error("CSRF_ORIGIN_REQUIRED");

  const parsed = new URL(origin);
  const canonical = getPublicApplicationOrigin(env);
  if (parsed.host !== host || parsed.origin !== canonical.origin) {
    throw new Error("CSRF_ORIGIN_DENIED");
  }
}
