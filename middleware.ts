import { NextResponse, type NextRequest } from "next/server";
import { securityHeaders } from "@/lib/security/http";
export function middleware(request: NextRequest) { const response = NextResponse.next(); for (const [k,v] of Object.entries(securityHeaders())) response.headers.set(k,v); if (request.nextUrl.pathname === "/reset-password") { response.headers.set("Referrer-Policy", "no-referrer"); response.headers.set("Cache-Control", "no-store"); } return response; }
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
