"use server";
import { revalidatePath } from "next/cache";
import { getApplicationContext } from "@/lib/auth/application-context";
import { TeamService } from "@/domains/infrastructure/prisma/team-service";
const service=async()=>new TeamService(await getApplicationContext());
const refresh=async<T>(result:T)=>{const context=await getApplicationContext();revalidatePath(`/${context.tenantSlug}/configuracoes`);revalidatePath(`/${context.tenantSlug}/agenda`);return result};
const clinicAccess=(form:FormData)=>({mode:String(form.get("clinicAccessMode")??"ALL"),clinicIds:form.getAll("clinicIds").map(String)});
export async function inviteMember(_:unknown,form:FormData){return refresh(await (await service()).invite({email:form.get("email"),role:form.get("role"),clinicAccess:clinicAccess(form)}));}
export async function rotateInvitation(_:unknown,form:FormData){return refresh(await (await service()).rotate(String(form.get("id"))));}
export async function revokeInvitation(_:unknown,form:FormData){return refresh(await (await service()).revokeInvitation(String(form.get("id"))));}
export async function updateMemberRole(_:unknown,form:FormData){return refresh(await (await service()).updateRole(String(form.get("id")),form.get("role")));}
export async function updateMemberClinicAccess(_:unknown,form:FormData){return refresh(await (await service()).updateClinicAccess(String(form.get("id")),clinicAccess(form)));}
export async function updateMemberStatus(_:unknown,form:FormData){return refresh(await (await service()).setStatus(String(form.get("id")),String(form.get("status")) as "ACTIVE"|"SUSPENDED"|"REVOKED"));}
export async function transferOwnership(_:unknown,form:FormData){return refresh(await (await service()).transferOwnership(String(form.get("id")),form.get("confirmation")));}
