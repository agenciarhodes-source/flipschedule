import { NextResponse,type NextRequest } from "next/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/auth/session";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";
export async function POST(request:NextRequest){const data=await request.formData(),slug=String(data.get("tenantSlug")??"");const context=await requireAuthenticatedTenantContext(slug);const response=NextResponse.redirect(new URL(`/${context.tenantSlug}/dashboard`,request.url),303);response.cookies.set(ACTIVE_TENANT_COOKIE,context.tenantSlug,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});return response}
