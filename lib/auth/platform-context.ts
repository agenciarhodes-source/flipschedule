import "server-only";
import { headers } from "next/headers";
import { getPrismaClient } from "@/lib/db";
import { getAuth } from "./server";
import type { PlatformContext } from "@/domains/application/platform";
export class PlatformAccessDeniedError extends Error {override name="PlatformAccessDeniedError"}
export async function getPlatformContext():Promise<PlatformContext>{
  const session=await getAuth().api.getSession({headers:await headers()});
  if(!session?.user)throw new PlatformAccessDeniedError();
  const row=await getPrismaClient().platformOperator.findUnique({where:{userId:session.user.id},select:{id:true,role:true,status:true,user:{select:{id:true,status:true,emailVerified:true,emailVerifiedAt:true,displayName:true}}}});
  if(!row||row.status!=="ACTIVE"||row.user.status!=="ACTIVE"||(!row.user.emailVerified&&!row.user.emailVerifiedAt))throw new PlatformAccessDeniedError();
  return {userId:row.user.id,operatorId:row.id,displayName:row.user.displayName,role:row.role};
}
export async function requirePlatformContext(){return getPlatformContext()}
