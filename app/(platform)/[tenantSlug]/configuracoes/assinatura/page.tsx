import Link from "next/link";
import { billingCheckoutStatusLabel,paymentStatusLabel,subscriptionStatusLabel } from "@/domains/application/billing";
import { hasPermission,requirePermission } from "@/domains/application/rbac";
import { PrismaBillingPlanCatalog } from "@/domains/infrastructure/billing/commercial-billing-catalog";
import { getApplicationContext } from "@/lib/auth/application-context";
import { getPrismaClient } from "@/lib/db";

const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export default async function SubscriptionSettingsPage(){
  const context=await getApplicationContext();
  requirePermission(context.membershipRole,"subscription.read");
  const prisma=getPrismaClient();
  const [subscription,payments,checkout,plans]=await Promise.all([
    prisma.subscription.findFirst({where:{tenantId:context.tenantId},orderBy:{updatedAt:"desc"}}),
    prisma.payment.findMany({where:{tenantId:context.tenantId},orderBy:{dueAt:"desc"},take:10}),
    prisma.billingCheckout.findFirst({where:{tenantId:context.tenantId,status:{in:["CREATED","ACTIVE","FAILED"]}},orderBy:{createdAt:"desc"}}),
    new PrismaBillingPlanCatalog(prisma).listActive(),
  ]);
  const canCheckout=hasPermission(context.membershipRole,"billing.checkout");
  return <main className="space-y-6 p-6">
    <div><Link className="text-sm text-muted-foreground underline" href={`/${context.tenantSlug}/configuracoes`}>Voltar às configurações</Link><h1 className="mt-2 text-2xl font-semibold">Assinatura</h1><p className="mt-2 text-sm text-muted-foreground">Estes valores se referem à assinatura do FlipSchedule, não aos pagamentos dos pacientes da clínica.</p></div>
    {plans.length===0&&<section className="rounded-xl border p-5"><h2 className="font-medium">Nenhum plano disponível para checkout online</h2><p className="mt-1 text-sm text-muted-foreground">A administração precisa habilitar explicitamente preço, ciclo e formas de pagamento antes que um plano possa ser contratado online.</p></section>}
    {plans.length>0&&<section className="rounded-xl border p-5"><h2 className="font-medium">Planos disponíveis</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{plans.map(plan=><div className="rounded-lg border p-4" key={plan.code}><div className="flex items-start justify-between gap-3"><div><strong>{plan.displayName}</strong><p className="mt-1 text-xs text-muted-foreground">{plan.cycle==="MONTHLY"?"Mensal":"Anual"} · {plan.allowedBillingTypes.map(type=>type==="CREDIT_CARD"?"Cartão":type==="BOLETO"?"Boleto":"PIX").join(", ")}</p></div><span className="font-medium">{money(plan.priceCents)}</span></div><button className="mt-4 rounded-md border px-4 py-2 text-sm opacity-50" disabled title="A criação do checkout Asaas será ligada após a fábrica segura do provedor">Contratação online em preparação</button></div>)}</div>{canCheckout?<p className="mt-3 text-xs text-muted-foreground">Seu perfil possui permissão de contratação. O próximo estágio liga estes planos à criação segura do checkout hospedado.</p>:null}</section>}
    <section className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border p-5"><h2 className="font-medium">Situação da assinatura</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt>Plano</dt><dd>{subscription?.planCode??"Não contratado"}</dd><dt>Status</dt><dd>{subscription?subscriptionStatusLabel(subscription.status):"Sem assinatura"}</dd><dt>Período atual</dt><dd>{subscription?.currentPeriodEnd?.toLocaleDateString("pt-BR")??"—"}</dd><dt>Cancelamento agendado</dt><dd>{subscription?.cancelAtPeriodEnd?"Sim":"Não"}</dd><dt>Carência</dt><dd>{subscription?.gracePeriodEndsAt?.toLocaleDateString("pt-BR")??"Não definida"}</dd><dt>Última sincronização</dt><dd>{subscription?.lastSyncedAt?.toLocaleString("pt-BR")??"—"}</dd></dl></div><div className="rounded-xl border p-5"><h2 className="font-medium">Checkout hospedado</h2><p className="mt-3 text-sm">{checkout?`Status: ${billingCheckoutStatusLabel(checkout.status)}`:"Nenhum checkout pendente."}</p>{checkout?.status==="FAILED"&&<p className="mt-2 text-sm text-destructive">Não foi possível criar o checkout. Tente novamente mais tarde.</p>}</div></section>
    <section className="rounded-xl border p-5"><h2 className="font-medium">Cobranças recentes da assinatura</h2>{payments.length===0?<p className="mt-3 text-sm text-muted-foreground">Nenhuma cobrança registrada.</p>:<ul className="mt-3 divide-y">{payments.map(payment=><li className="flex justify-between py-3 text-sm" key={payment.id}><span>{payment.dueAt.toLocaleDateString("pt-BR")} · {paymentStatusLabel(payment.status)}</span><strong>{money(payment.amountCents)}</strong></li>)}</ul>}</section>
  </main>;
}
