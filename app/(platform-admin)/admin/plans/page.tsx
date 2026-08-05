import { unstable_noStore as noStore } from "next/cache";

import { PlatformAdminReader } from "@/domains/infrastructure/platform/readers";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";
import { createPlanAction, setPlanStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  created: "Plano cadastrado com sucesso.",
  "status-updated": "Status do plano atualizado.",
  "code-conflict": "Já existe um plano com esse código.",
  invalid: "Não foi possível concluir. Revise os dados.",
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function PlatformPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  noStore();
  const context = await getPlatformContext();
  const [plans, query] = await Promise.all([
    new PlatformAdminReader(getPrismaClient()).plans(context),
    searchParams,
  ]);
  const message = query.result ? feedback[query.result] : undefined;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Catálogo comercial</p>
        <h1 className="mt-2 font-display text-4xl">Planos</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Os valores são definidos pela administração e usados na atribuição manual das clínicas.
          Nenhuma cobrança externa é criada nesta tela.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <section className="card-surface p-6" aria-labelledby="new-plan-title">
        <h2 id="new-plan-title" className="font-display text-2xl">
          Criar plano
        </h2>
        <form action={createPlanAction} className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium">
            Código
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3 font-mono uppercase"
              name="code"
              required
              minLength={2}
              maxLength={40}
              pattern="[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*"
              placeholder="CLINICA_PRO"
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Nome
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
              name="name"
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label className="text-sm font-medium">
            Ciclo
            <select
              className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
              name="cycle"
              defaultValue="MONTHLY"
            >
              <option value="MONTHLY">Mensal</option>
              <option value="YEARLY">Anual</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Valor em reais
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
              name="price"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Dias de teste
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
              name="trialDays"
              type="number"
              min="0"
              max="365"
              defaultValue="0"
            />
          </label>
          <label className="text-sm font-medium">
            Limite de unidades
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
              name="maxClinics"
              type="number"
              min="1"
              placeholder="Sem limite"
            />
          </label>
          <label className="text-sm font-medium">
            Limite de usuários
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
              name="maxUsers"
              type="number"
              min="1"
              placeholder="Sem limite"
            />
          </label>
          <div className="flex items-end">
            <button className="min-h-11 rounded-md bg-primary px-5 font-medium text-primary-foreground">
              Cadastrar plano
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="plan-list-title">
        <h2 id="plan-list-title" className="font-display text-2xl">
          Planos cadastrados
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr>
                <th className="p-3">Plano</th>
                <th className="p-3">Ciclo</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Limites</th>
                <th className="p-3">Clientes</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td className="p-6 text-ink-muted" colSpan={6}>
                    Nenhum plano cadastrado.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr className="border-t border-line" key={plan.id}>
                    <td className="p-3">
                      <strong>{plan.name}</strong>
                      <span className="mt-1 block font-mono text-xs text-ink-muted">{plan.code}</span>
                    </td>
                    <td className="p-3">{plan.cycle}</td>
                    <td className="p-3">{money.format(plan.priceCents / 100)}</td>
                    <td className="p-3 text-xs text-ink-muted">
                      {plan.maxClinics ? `${plan.maxClinics} unidade(s)` : "unidades sem limite"}
                      <br />
                      {plan.maxUsers ? `${plan.maxUsers} usuário(s)` : "usuários sem limite"}
                    </td>
                    <td className="p-3">{plan._count.subscriptions}</td>
                    <td className="p-3">
                      <form action={setPlanStatusAction} className="flex items-center gap-2">
                        <input name="planId" type="hidden" value={plan.id} />
                        <select
                          className="min-h-9 rounded-md border border-line bg-bg px-2"
                          name="status"
                          defaultValue={plan.status}
                        >
                          <option value="ACTIVE">Ativo</option>
                          <option value="INACTIVE">Inativo</option>
                          <option value="ARCHIVED">Arquivado</option>
                        </select>
                        <button className="min-h-9 rounded-md border border-line px-3">Salvar</button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
