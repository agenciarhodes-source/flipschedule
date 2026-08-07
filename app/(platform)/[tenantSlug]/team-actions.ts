"use server";
import { revalidatePath } from "next/cache";
import { getApplicationContext } from "@/lib/auth/application-context";
import { TeamService } from "@/domains/infrastructure/prisma/team-service";
import { ClinicAccessManagementService } from "@/domains/infrastructure/prisma/clinic-access-management";
const service=async()=>new TeamService(await getApplicationContext());
const refresh=async<T>(result:T)=>{const context=await getApplicationContext();revalidatePath(`/${context.tenantSlug}/configuracoes`);revalidatePath(`/${context.tenantSlug}/agenda`);return result};
export async function inviteMember(_:unknown,form:FormData){return refresh(await (await service()).invite({email:form.get("email"),role:form.get("role")}));}
export async function rotateInvitation(_:unknown,form:FormData){return refresh(await (await service()).rotate(String(form.get("id"))));}
export async function revokeInvitation(_:unknown,form:FormData){return refresh(await (await service()).revokeInvitation(String(form.get("id"))));}
export async function updateMemberRole(_:unknown,form:FormData){return refresh(await (await service()).updateRole(String(form.get("id")),form.get("role")));}
export async function updateMemberStatus(_:unknown,form:FormData){return refresh(await (await service()).setStatus(String(form.get("id")),String(form.get("status")) as "ACTIVE"|"SUSPENDED"|"REVOKED"));}
export async function transferOwnership(_:unknown,form:FormData){return refresh(await (await service()).transferOwnership(String(form.get("id")),form.get("confirmation")));}
export async function updateMemberClinicAccess(_:unknown,form:FormData){const context=await getApplicationContext();const clinicAccess=new ClinicAccessManagementService(context);return refresh(await clinicAccess.replace(String(form.get("id")),form.getAll("clinicIds").map(String)));}
