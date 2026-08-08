import { unstable_noStore as noStore } from "next/cache";

import { PlatformAdminReader } from "@/domains/infrastructure/platform/readers";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";
import {
  assignClientPlanAction,
  createClientAction,
  setClientStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  created: "Clínica e acesso do proprietário criados com sucesso.",
  "status-updated": "Status da clínica atualizado.",
  "plan-updated": "Plano da clínica atualizado.",
  "slug-conflict": "Já existe uma clínica com esse identificador.",
  "email-conflict": "Esse e-mail já pertence a uma conta existente.",
  "plan-inactive": "Selecione um plano ativo.",
  "plan-capacity":
    "O plano selecionado não comporta o uso atual da clínica. Reduza unidades, acessos ou convites reservados antes do downgrade, ou escolha um plano com limites maiores.",
  "provider-managed-plan":
    "Esta clínica possui assinatura Asaas gerenciada pelo provedor. A troca de plano deve ser feita pelo fluxo de assinatura para manter cobrança e plano sincronizados.",
  "tenant-not-found": "A clínica não foi encontrada.",
  invalid: "Não foi possível concluir. Revise os dados e tente novamente.",
  unavailable: "O serviço está temporariamente indisponível.",
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function PlatformClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  noStore();
  const context = await getPlatformContext();
  const reader = new PlatformAdminReader(getPrismaClient());
  const [clients, plans, query] = await Promise.all([
    reader.clients(context),
    reader.plans(context, false),
    searchParams,
  ]);
  const message = query.result ? feedback[query.result] : undefined;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Clientes da plataforma</p>
        <h1 className="mt-2 font-display text-4xl">Clínicas e acessos</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Cada cliente é um tenant isolado. O proprietário recebe uma senha temporária e precisa
          criar a senha definitiva antes de acessar a clínica.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <section className="card-surface p-6" aria-labelledby="new-client-title">
        <h2 id="new-client-title" className="font-display text-2xl">
          Adicionar clínica cliente
        </h2>
        {plans.length === 0 ? (
          <p className="mt-4 rounded-md border border-warm/30 bg-warm/10 p-4 text-sm">
            Cadastre ao menos um plano ativo em “Planos” antes de adicionar uma clínica.
          </p>
        ) : (
          <form action={createClientAction} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Nome da clínica
              <input
                className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
                name="tenantName"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label className="text-sm font-medium">
              Identificador na URL
              <input
                className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3 font-mono"
                name="tenantSlug"
                required
                minLength={3}
                maxLength={63}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="clinica-exemplo"
              />
            </label>
            <label className="text-sm font-medium">
              Nome do proprietário
              <input
                className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
                name="ownerName"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label className="text-sm font-medium">
              E-mail de acesso
              <input
                className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
                name="ownerEmail"
                type="email"
                autoComplete="off"
                required
              />
            </label>
            <label className="text-sm font-medium">
              Senha temporária
              <input
                className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
                name="temporaryPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
              />
              <span className="mt-1 block text-xs text-ink-muted">
                Mínimo de 12 caracteres, com maiúscula, minúscula, número e símbolo.
              </span>
            </label>
            <label className="text-sm font-medium">
              Plano
              <select
                className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
                name="planId"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione
                </option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {money.format(plan.priceCents / 100)} · {plan.cycle}
                  </option>
                ))}
              </select>
            </label>
            <input name="timezone" type="hidden" value="America/Sao_Paulo" />
            <input name="locale" type="hidden" value="pt-BR" />
            <div className="md:col-span-2">
              <button className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground">
                Criar clínica e acesso
              </button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="client-list-title">
        <h2 id="client-list-title" className="font-display text-2xl">
          Clientes cadastrados
        </h2>
        <div className="mt-4 space-y-4">
          {clients.length === 0 ? (
            <p className="card-surface p-6 text-sm text-ink-muted">Nenhuma clínica cadastrada.</p>
          ) : (
            clients.map((client) => (
              <article className="card-surface p-5" key={client.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl">{client.name}</h3>
                    <p className="mt-1 font-mono text-xs text-ink-muted">/{client.slug}</p>
                    <p className="mt-3 text-sm text-ink-muted">
                      Proprietário: {client.owner?.name ?? "não definido"} · {client.owner?.emailMasked ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-ink-dim">
                      {client._count.clinics} unidade(s) · {client._count.memberships} usuário(s)
                      {client.owner?.temporaryPasswordPending ? " · troca de senha pendente" : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold">
                    {client.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 border-t border-line pt-5 lg:grid-cols-2">
                  <form action={assignClientPlanAction} className="flex flex-wrap items-end gap-2">
                    <input name="tenantId" type="hidden" value={client.id} />
                    <label className="min-w-56 flex-1 text-sm font-medium">
                      Plano atual: {client.subscription?.commercialPlan?.name ?? client.subscription?.planCode ?? "—"}
                      <select
                        className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                        name="planId"
                        required
                        defaultValue={client.subscription?.commercialPlan?.id ?? ""}
                      >
                        <option value="" disabled>
                          Selecione um plano
                        </option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="min-h-10 rounded-md border border-line px-4 text-sm">
                      Atualizar plano
                    </button>
                  </form>

                  <form action={setClientStatusAction} className="flex flex-wrap items-end gap-2">
                    <input name="tenantId" type="hidden" value={client.id} />
                    <label className="min-w-44 flex-1 text-sm font-medium">
                      Alterar status
                      <select
                        className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                        name="status"
                        defaultValue={client.status}
                      >
                        <option value="ACTIVE">Ativa</option>
                        <option value="SUSPENDED">Suspensa</option>
                        <option value="ARCHIVED">Arquivada</option>
                      </select>
                    </label>
                    <label className="min-w-64 flex-[2] text-sm font-medium">
                      Motivo
                      <input
                        className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                        name="reason"
                        required
                        minLength={10}
                        maxLength={500}
                        placeholder="Informe o motivo da alteração"
                      />
                    </label>
                    <button className="min-h-10 rounded-md border border-line px-4 text-sm">
                      Salvar status
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
