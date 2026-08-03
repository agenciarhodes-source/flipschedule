"use server";
import {PublicTreatmentPlanService} from "@/domains/infrastructure/prisma/treatment-inbox-services";
export async function viewPublicPlan(token:string){return new PublicTreatmentPlanService().view(token)}
export async function respondPublicPlan(token:string,response:"ACCEPTED"|"REJECTED"){return new PublicTreatmentPlanService().respond(token,response)}
