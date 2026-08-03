import "server-only";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";
const grantSchema=z.object({tenantId:z.string().uuid(),operatorId:z.string().uuid(),reason:z.string().trim().min(10).max(500),expiresAt:z.coerce.date()});
export class PlatformSupportGrantService{constructor(private prisma:PrismaClient){}
 async create(context:PlatformContext,input:unknown){requirePlatformPermission(context.role,"platform.support.grant");const data=grantSchema.parse(input);if(data.expiresAt<=new Date()||data.expiresAt.getTime()>Date.now()+30*86400000)throw new Error("INVALID_GRANT_EXPIRY");return this.prisma.$transaction(async tx=>{const grant=await tx.platformSupportGrant.create({data:{...data,createdByOperatorId:context.operatorId}});await tx.auditLog.create({data:{actorUserId:context.userId,tenantId:data.tenantId,action:"platform.support_grant.created",resourceType:"PlatformSupportGrant",resourceId:grant.id,outcome:"SUCCESS"}});return grant})}
 async requireActive(context:PlatformContext,tenantId:string){requirePlatformPermission(context.role,"platform.support.read");const grant=await this.prisma.platformSupportGrant.findFirst({where:{operatorId:context.operatorId,tenantId,revokedAt:null,expiresAt:{gt:new Date()}},select:{id:true,tenantId:true,expiresAt:true}});if(!grant)throw new Error("PLATFORM_ACCESS_DENIED");return grant}
}
