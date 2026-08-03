"use server";
import { cookies,headers } from "next/headers";
import { PublicInvitationService } from "@/domains/infrastructure/prisma/team-service";
import { getAuth } from "@/lib/auth/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/auth/session";
export async function inspectInvitation(token:string){try{return await new PublicInvitationService().inspect(token)}catch{return null}}
export async function acceptInvitation(token:string){const session=await getAuth().api.getSession({headers:await headers()});if(!session?.user)return {ok:false as const,code:"ACCESS_DENIED" as const,message:"Entre na conta correspondente para aceitar o convite."};const result=await new PublicInvitationService().accept(token,{id:session.user.id,email:session.user.email});if(result.ok)(await cookies()).set(ACTIVE_TENANT_COOKIE,result.data.tenantSlug,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});return result;}
