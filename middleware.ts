import { NextResponse, type NextRequest } from "next/server";

import { securityHeaders } from "@/lib/security/http";

function isSecureRequest(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwardedProtocol ? forwardedProtocol === "https" : request.nextUrl.protocol === "https:";
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  for (const [name, value] of Object.entries(
    securityHeaders(process.env, { secureTransport: isSecureRequest(request) }),
  )) {
    response.headers.set(name, value);
  }

  if (request.nextUrl.pathname === "/reset-password") {
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
