"use server";
import {revalidatePath} from "next/cache";
import {getApplicationContext} from "@/lib/auth/application-context";
import {OrganizationSettingsService} from "@/domains/infrastructure/prisma/reports-settings";
export async function updateOrganization(form:FormData){const context=await getApplicationContext(),result=await new OrganizationSettingsService(context).update({name:form.get("name"),timezone:form.get("timezone"),locale:form.get("locale")});if(result.ok)revalidatePath(`/${context.tenantSlug}/configuracoes`);return result}
