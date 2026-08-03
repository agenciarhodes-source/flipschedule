"use server";
import { headers } from "next/headers";
import { PublicInvitationService } from "@/domains/infrastructure/prisma/team-service";
import { getAuth } from "@/lib/auth/server";
export async function inspectInvitation(token:string){try{return await new PublicInvitationService().inspect(token)}catch{return null}}
export async function acceptInvitation(token:string){const session=await getAuth().api.getSession({headers:await headers()});if(!session?.user)return {ok:false as const,code:"ACCESS_DENIED" as const,message:"Entre na conta correspondente para aceitar o convite."};return new PublicInvitationService().accept(token,{id:session.user.id,email:session.user.email});}
