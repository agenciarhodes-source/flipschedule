import Link from "next/link";
import { billingPlanCatalog,billingCheckoutStatusLabel,paymentStatusLabel,subscriptionStatusLabel } from "@/domains/application/billing";
import { hasPermission,requirePermission } from "@/domains/application/rbac";
import { getApplicationContext } from "@/lib/auth/application-context";
import { getPrismaClient } from "@/lib/db";

const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export default async function SubscriptionSettingsPage(){
  const context=await getApplicationContext();
  requirePermission(context.membershipRole,"subscription.read");
  const prisma=getPrismaClient();
  const [subscription,payments,checkout]=await Promise.all([
    prisma.subscription.findFirst({where:{tenantId:context.tenantId},orderBy:{updatedAt:"desc"}}),
    prisma.payment.findMany({where:{tenantId:context.tenantId},orderBy:{dueAt:"desc"},take:10}),
    prisma.billingCheckout.findFirst({where:{tenantId:context.tenantId,status:{in:["CREATED","ACTIVE","FAILED"]}},orderBy:{createdAt:"desc"}}),
  ]);
  const plans=billingPlanCatalog.listActive();
  return <main className="space-y-6 p-6">
    <div><Link className="text-sm text-muted-foreground underline" href={`/${context.tenantSlug}/configuracoes`}>Voltar às configurações</Link><h1 className="mt-2 text-2xl font-semibold">Assinatura</h1><p className="mt-2 text-sm text-muted-foreground">Estes valores se referem à assinatura do FlipSchedule, não aos pagamentos dos pacientes da clínica.</p></div>
    {plans.length===0&&<section className="rounded-xl border p-5"><h2 className="font-medium">Planos comerciais ainda não configurados</h2><p className="mt-1 text-sm text-muted-foreground">A contratação permanecerá indisponível até nome, preço, limites e política comercial serem aprovados.</p><button className="mt-4 rounded-md border px-4 py-2 text-sm opacity-50" disabled>Iniciar assinatura</button></section>}
    <section className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border p-5"><h2 className="font-medium">Situação da assinatura</h2><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt>Plano</dt><dd>{subscription?.planCode??"Não contratado"}</dd><dt>Status</dt><dd>{subscription?subscriptionStatusLabel(subscription.status):"Sem assinatura"}</dd><dt>Período atual</dt><dd>{subscription?.currentPeriodEnd?.toLocaleDateString("pt-BR")??"—"}</dd><dt>Cancelamento agendado</dt><dd>{subscription?.cancelAtPeriodEnd?"Sim":"Não"}</dd><dt>Carência</dt><dd>{subscription?.gracePeriodEndsAt?.toLocaleDateString("pt-BR")??"Não definida"}</dd><dt>Última sincronização</dt><dd>{subscription?.lastSyncedAt?.toLocaleString("pt-BR")??"—"}</dd></dl></div><div className="rounded-xl border p-5"><h2 className="font-medium">Checkout hospedado</h2><p className="mt-3 text-sm">{checkout?`Status: ${billingCheckoutStatusLabel(checkout.status)}`:"Nenhum checkout pendente."}</p>{checkout?.status==="FAILED"&&<p className="mt-2 text-sm text-destructive">Não foi possível criar o checkout. Tente novamente mais tarde.</p>}<button className="mt-4 rounded-md border px-4 py-2 text-sm opacity-50" disabled={!hasPermission(context.membershipRole,"billing.checkout")||plans.length===0}>Gerar novo checkout</button></div></section>
    <section className="rounded-xl border p-5"><h2 className="font-medium">Cobranças recentes da assinatura</h2>{payments.length===0?<p className="mt-3 text-sm text-muted-foreground">Nenhuma cobrança registrada.</p>:<ul className="mt-3 divide-y">{payments.map(payment=><li className="flex justify-between py-3 text-sm" key={payment.id}><span>{payment.dueAt.toLocaleDateString("pt-BR")} · {paymentStatusLabel(payment.status)}</span><strong>{money(payment.amountCents)}</strong></li>)}</ul>}</section>
  </main>;
}
