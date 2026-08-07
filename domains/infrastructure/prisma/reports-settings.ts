import "server-only";
import {z} from "zod";
import type {PrismaClient} from "@/generated/prisma/client";
import type {ApplicationContext} from "@/domains/application/context";
import type {OrganizationSettingsView,ReportBreakdown,ReportSnapshot} from "@/domains/application/view-models";
import {scopedClinicIds} from "@/domains/application/clinic-access";
import {hasPermission} from "@/domains/application/rbac";
import {actionFailure} from "@/domains/application/actions";
import {getPrismaClient} from "@/lib/db";

const rangeSchema=z.object({from:z.coerce.date(),to:z.coerce.date()}).refine(x=>x.to>x.from&&x.to.getTime()-x.from.getTime()<=366*864e5);
const empty=(id:string,name:string):ReportBreakdown=>({id,name,appointments:0,attended:0,noShows:0,revenueCents:0,acceptedPlans:0,acceptedValueCents:0});

export class PrismaReportReader{
 constructor(private context:ApplicationContext,private p:PrismaClient=getPrismaClient()){}
 async read(input:{from:string;to:string}):Promise<ReportSnapshot>{
  const {from,to}=rangeSchema.parse(input),duration=to.getTime()-from.getTime(),previousFrom=new Date(from.getTime()-duration),tenantId=this.context.tenantId;
  const allowed=scopedClinicIds(this.context);
  const clinicScope=allowed===null?{}:{clinicId:{in:allowed}};
  const patientScope=allowed===null?{}:{OR:[{appointments:{some:{tenantId,clinicId:{in:allowed}}}},{leads:{some:{tenantId,clinicId:{in:allowed}}}},{treatmentPlans:{some:{tenantId,clinicId:{in:allowed}}}}]};
  const conversationScope=allowed===null?{}:{lead:{clinicId:{in:allowed}}};
  const consentPatientScope=allowed===null?{}:{patient:patientScope};
  const professionalScope=allowed===null?{}:{clinics:{some:{tenantId,clinicId:{in:allowed},active:true}}};
  const [appointments,previousAppointments,newPatients,previousPatients,leads,previousWon,plans,previousPlans,conversations,unreadMessages,consentPatients,revokedConsents,clinics,professionals]=await Promise.all([
   this.p.appointment.findMany({where:{tenantId,...clinicScope,startsAt:{gte:from,lt:to}},select:{clinicId:true,professionalId:true,status:true,priceCents:true}}),
   this.p.appointment.findMany({where:{tenantId,...clinicScope,startsAt:{gte:previousFrom,lt:from}},select:{status:true}}),
   this.p.patient.count({where:{tenantId,...patientScope,createdAt:{gte:from,lt:to}}}),
   this.p.patient.count({where:{tenantId,...patientScope,createdAt:{gte:previousFrom,lt:from}}}),
   this.p.lead.findMany({where:{tenantId,...clinicScope,createdAt:{gte:from,lt:to}},select:{wonAt:true}}),
   this.p.lead.count({where:{tenantId,...clinicScope,wonAt:{gte:previousFrom,lt:from}}}),
   this.p.treatmentPlan.findMany({where:{tenantId,...clinicScope,createdAt:{gte:from,lt:to}},select:{clinicId:true,professionalId:true,status:true,totalCents:true}}),
   this.p.treatmentPlan.findMany({where:{tenantId,...clinicScope,createdAt:{gte:previousFrom,lt:from}},select:{status:true,totalCents:true}}),
   this.p.conversation.count({where:{tenantId,...conversationScope,createdAt:{gte:from,lt:to}}}),
   this.p.message.count({where:{tenantId,direction:"INBOUND",readAt:null,createdAt:{gte:from,lt:to},...(allowed===null?{}:{conversation:{lead:{clinicId:{in:allowed}}}})}}),
   this.p.consent.groupBy({by:["patientId"],where:{tenantId,...consentPatientScope,granted:true,revokedAt:null}}),
   this.p.consent.count({where:{tenantId,...consentPatientScope,revokedAt:{gte:from,lt:to}}}),
   this.p.clinic.findMany({where:{tenantId,...(allowed===null?{}:{id:{in:allowed}})},select:{id:true,name:true}}),
   this.p.professional.findMany({where:{tenantId,...professionalScope},select:{id:true,name:true}})
  ]);
  const clinicMap=new Map(clinics.map(x=>[x.id,empty(x.id,x.name)])),professionalMap=new Map(professionals.map(x=>[x.id,empty(x.id,x.name)]));
  for(const a of appointments)for(const row of [clinicMap.get(a.clinicId),professionalMap.get(a.professionalId)])if(row){row.appointments++;if(a.status==="ATTENDED"){row.attended++;row.revenueCents+=a.priceCents}if(a.status==="NO_SHOW")row.noShows++}
  for(const plan of plans)if(plan.status==="ACCEPTED")for(const row of [plan.clinicId?clinicMap.get(plan.clinicId):undefined,plan.professionalId?professionalMap.get(plan.professionalId):undefined])if(row){row.acceptedPlans++;row.acceptedValueCents+=plan.totalCents}
  const accepted=plans.filter(x=>x.status==="ACCEPTED"),previousAccepted=previousPlans.filter(x=>x.status==="ACCEPTED");
  return {period:{from:from.toISOString(),to:to.toISOString()},previousPeriod:{from:previousFrom.toISOString(),to:from.toISOString()},appointments:appointments.length,attended:appointments.filter(x=>x.status==="ATTENDED").length,noShows:appointments.filter(x=>x.status==="NO_SHOW").length,newPatients,leads:leads.length,wonLeads:leads.filter(x=>x.wonAt).length,treatmentPlans:plans.length,acceptedPlans:accepted.length,proposedValueCents:plans.reduce((s,x)=>s+x.totalCents,0),acceptedValueCents:accepted.reduce((s,x)=>s+x.totalCents,0),conversations,unreadMessages,consentPatients:consentPatients.length,revokedConsents,clinics:[...clinicMap.values()],professionals:[...professionalMap.values()],previous:{appointments:previousAppointments.length,attended:previousAppointments.filter(x=>x.status==="ATTENDED").length,newPatients:previousPatients,wonLeads:previousWon,acceptedPlans:previousAccepted.length,acceptedValueCents:previousAccepted.reduce((s,x)=>s+x.totalCents,0)}}
 }
}

export class OrganizationSettingsService{
 constructor(private context:ApplicationContext,private p:PrismaClient=getPrismaClient()){}
 async read():Promise<OrganizationSettingsView>{const [tenant,integrations,subscription]=await Promise.all([this.p.tenant.findFirstOrThrow({where:{id:this.context.tenantId},select:{name:true,slug:true,timezone:true,locale:true}}),this.p.integration.findMany({where:{tenantId:this.context.tenantId},select:{provider:true,status:true,connectedAt:true},orderBy:{provider:"asc"}}),this.p.subscription.findFirst({where:{tenantId:this.context.tenantId},select:{planCode:true,status:true,currentPeriodEnd:true,cancelAtPeriodEnd:true},orderBy:{updatedAt:"desc"}})]);return {...tenant,integrations:integrations.map(x=>({...x,connectedAt:x.connectedAt?.toISOString()??null})),subscription:subscription?{...subscription,currentPeriodEnd:subscription.currentPeriodEnd?.toISOString()??null}:null}}
 async update(input:unknown){if(!hasPermission(this.context.membershipRole,"organization.update"))return actionFailure("ACCESS_DENIED","Você não tem permissão para alterar a organização.");const parsed=z.object({name:z.string().trim().min(2).max(120),timezone:z.string().trim().refine(v=>{try{Intl.DateTimeFormat("pt-BR",{timeZone:v});return true}catch{return false}},"Timezone inválido."),locale:z.literal("pt-BR")}).safeParse(input);if(!parsed.success)return actionFailure("VALIDATION_ERROR","Revise os campos informados.");try{return await this.p.$transaction(async tx=>{await tx.tenant.update({where:{id:this.context.tenantId},data:parsed.data});await tx.auditLog.create({data:{tenantId:this.context.tenantId,actorUserId:this.context.userId,actorMembershipId:this.context.membershipId,action:"tenant.settings.update",resourceType:"Tenant",resourceId:this.context.tenantId,outcome:"SUCCESS"}});return {ok:true,data:parsed.data} as const})}catch{return actionFailure("UNAVAILABLE","Não foi possível salvar as configurações.")}}
}
