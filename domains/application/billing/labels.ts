import type { BillingCheckoutStatus,EntitlementStatus,PaymentStatus,SubscriptionStatus } from "@/generated/prisma/client";
const subscription:Record<SubscriptionStatus,string>={PENDING:"Pendente",ACTIVE:"Ativa",PAST_DUE:"Em atraso",SUSPENDED:"Suspensa",CANCELLED:"Cancelada",EXPIRED:"Expirada"};
const payment:Record<PaymentStatus,string>={PENDING:"Pendente",CONFIRMED:"Confirmado",RECEIVED:"Recebido",OVERDUE:"Vencido",REFUNDED:"Estornado",CANCELLED:"Cancelado",FAILED:"Recusado"};
const checkout:Record<BillingCheckoutStatus,string>={CREATED:"Criado",ACTIVE:"Ativo",PAID:"Pago",CANCELLED:"Cancelado",EXPIRED:"Expirado",FAILED:"Falhou"};
const entitlement:Record<EntitlementStatus,string>={ACTIVE:"Ativo",EXPIRED:"Expirado",REVOKED:"Revogado"};
export const subscriptionStatusLabel=(value:SubscriptionStatus)=>subscription[value];export const paymentStatusLabel=(value:PaymentStatus)=>payment[value];export const billingCheckoutStatusLabel=(value:BillingCheckoutStatus)=>checkout[value];export const entitlementStatusLabel=(value:EntitlementStatus)=>entitlement[value];
