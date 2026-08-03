"use server";
import { revalidatePath } from "next/cache";
import { getApplicationContext } from "@/lib/auth/application-context";
import { createPrismaServices } from "@/domains/infrastructure/prisma/factory";
const value=(f:FormData,k:string)=>String(f.get(k)??"").trim();const nullable=(f:FormData,k:string)=>value(f,k)||null;
async function setup(){const context=await getApplicationContext();return {context,services:createPrismaServices(context)}}
function refresh(slug:string){revalidatePath(`/${slug}/crm`);revalidatePath(`/${slug}/pacientes`);revalidatePath(`/${slug}/agenda`)}
export async function saveLead(form:FormData){const {context,services}=await setup();const input={name:value(form,"name"),phoneE164:nullable(form,"phoneE164"),emailNormalized:nullable(form,"email"),pipelineId:value(form,"pipelineId"),stageId:value(form,"stageId"),clinicId:nullable(form,"clinicId"),assignedMembershipId:nullable(form,"assignedMembershipId"),estimatedValueCents:Number(value(form,"estimatedValueCents")||0),source:nullable(form,"source")};const id=nullable(form,"id");const result=id?await services.leads.update(id,input):await services.leads.create(input);if(result.ok)refresh(context.tenantSlug);return result}
export async function moveLead(form:FormData){const {context,services}=await setup();const result=await services.leads.move(value(form,"id"),{stageId:value(form,"stageId"),reason:nullable(form,"reason")});if(result.ok)refresh(context.tenantSlug);return result}
export async function convertLead(form:FormData){const {context,services}=await setup();const result=await services.leads.convert(value(form,"id"));if(result.ok)refresh(context.tenantSlug);return result}
export async function savePatient(form:FormData){const {context,services}=await setup();const input={name:value(form,"name"),phoneE164:nullable(form,"phoneE164"),emailNormalized:nullable(form,"email"),birthDate:nullable(form,"birthDate"),archived:form.get("archived")==="on"};const id=nullable(form,"id");const result=id?await services.patients.update(id,input):await services.patients.create(input);if(result.ok)refresh(context.tenantSlug);return result}
