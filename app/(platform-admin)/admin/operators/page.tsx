import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { PlatformAdministrationDirectoryReader } from "@/domains/infrastructure/platform/administration-directory-reader";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";
import { changePlatformOperatorAction } from "./actions";

export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  "operator-updated": "Papel ou status do operador atualizado com segurança.",
  "self-change-denied": "Seu próprio papel administrativo não pode ser alterado por esta tela.",
  "last-owner-required": "A operação deixaria a plataforma sem um proprietário ativo.",
  "access-denied": "Seu papel não permite administrar esse operador.",
  "no-change": "Nenhuma alteração foi selecionada.",
  invalid: "Não foi possível concluir. Revise os dados e tente novamente.",
  unavailable: "O serviço está temporariamente indisponível.",
};

const roleLabel: Record<string, string> = {
  PLATFORM_OWNER: "Proprietário da plataforma",
  PLATFORM_ADMIN: "Administrador da plataforma",
  SUPPORT: "Suporte",
  BILLING: "Financeiro",
  READONLY: "Somente leitura",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  REVOKED: "Revogado",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type SearchParams = {
  q?: string;
  role?: string;
  status?: string;
  page?: string;
  result?: string;
};

function directoryHref(
  filters: { q: string; role: string; status: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.role !== "ALL") params.set("role", filters.role);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/operators?${query}` : "/admin/operators";
}

export default async function PlatformOperatorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  noStore();
  const [context, raw] = await Promise.all([getPlatformContext(), searchParams]);
  const reader = new PlatformAdministrationDirectoryReader(getPrismaClient());
  const directory = await reader.operators(context, {
    page: raw.page,
    q: raw.q,
    role: raw.role,
    status: raw.status,
  });
  const message = raw.result ? feedback[raw.result] : undefined;
  const returnTo = directoryHref(directory.filters, directory.page);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Governança da plataforma</p>
        <h1 className="mt-2 font-display text-4xl">Operadores administrativos</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Gerencie os papéis internos sem misturá-los aos acessos das clínicas. A proteção do
          último proprietário ativo é aplicada dentro da transação no servidor.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <form className="card-surface grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_200px_auto]" method="get">
        <label className="text-sm font-medium">
          Buscar operador
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={directory.filters.q}
            maxLength={120}
            name="q"
            placeholder="Nome ou e-mail"
          />
        </label>
        <label className="text-sm font-medium">
          Papel
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={directory.filters.role}
            name="role"
          >
            <option value="ALL">Todos</option>
            <option value="PLATFORM_OWNER">Proprietário</option>
            <option value="PLATFORM_ADMIN">Administrador</option>
            <option value="SUPPORT">Suporte</option>
            <option value="BILLING">Financeiro</option>
            <option value="READONLY">Somente leitura</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={directory.filters.status}
            name="status"
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="SUSPENDED">Suspensos</option>
            <option value="REVOKED">Revogados</option>
          </select>
        </label>
        <button className="min-h-11 self-end rounded-md bg-primary px-5 font-medium text-primary-foreground">
          Filtrar
        </button>
      </form>

      <section aria-labelledby="operator-directory-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="operator-directory-title" className="font-display text-2xl">
              Diretório administrativo
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {directory.total} operador(es) encontrado(s).
            </p>
          </div>
          <Link className="text-sm font-medium text-primary" href="/admin/users">
            Consultar todos os usuários
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {directory.rows.length === 0 ? (
            <p className="card-surface p-6 text-sm text-ink-muted">
              Nenhum operador corresponde aos filtros informados.
            </p>
          ) : (
            directory.rows.map((operator) => {
              const isCurrentOperator = operator.id === context.operatorId;
              return (
                <article className="card-surface p-5" key={operator.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-2xl">{operator.user.displayName}</h3>
                        {isCurrentOperator ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            Seu operador
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 font-mono text-xs text-ink-muted">{operator.user.emailMasked}</p>
                      <p className="mt-3 text-xs text-ink-dim">
                        Criado em {dateTime.format(operator.createdAt)} · atualizado em {dateTime.format(operator.updatedAt)} · {operator.user._count.authSessions} sessão(ões)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full border border-line px-3 py-1">
                        {roleLabel[operator.role] ?? operator.role}
                      </span>
                      <span className="rounded-full border border-line px-3 py-1">
                        {statusLabel[operator.status] ?? operator.status}
                      </span>
                      <span className="rounded-full border border-line px-3 py-1">
                        Conta {operator.user.status}
                      </span>
                      <span className="rounded-full border border-line px-3 py-1">
                        {operator.user.emailVerified ? "E-mail verificado" : "E-mail pendente"}
                      </span>
                    </div>
                  </div>

                  <form action={changePlatformOperatorAction} className="mt-5 grid gap-4 border-t border-line pt-5 md:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_minmax(200px,1fr)_auto]">
                    <input name="operatorId" type="hidden" value={operator.id} />
                    <input name="currentRole" type="hidden" value={operator.role} />
                    <input name="currentStatus" type="hidden" value={operator.status} />
                    <input name="returnTo" type="hidden" value={returnTo} />
                    <label className="text-sm font-medium">
                      Papel administrativo
                      <select
                        className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                        defaultValue={operator.role}
                        disabled={isCurrentOperator}
                        name="role"
                      >
                        <option value="PLATFORM_OWNER">Proprietário da plataforma</option>
                        <option value="PLATFORM_ADMIN">Administrador da plataforma</option>
                        <option value="SUPPORT">Suporte</option>
                        <option value="BILLING">Financeiro</option>
                        <option value="READONLY">Somente leitura</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Status do operador
                      <select
                        className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                        defaultValue={operator.status}
                        disabled={isCurrentOperator}
                        name="status"
                      >
                        <option value="ACTIVE">Ativo</option>
                        <option value="SUSPENDED">Suspenso</option>
                        <option value="REVOKED">Revogado</option>
                      </select>
                    </label>
                    <button
                      className="min-h-10 self-end rounded-md border border-line px-5 text-sm font-medium"
                      disabled={isCurrentOperator}
                    >
                      Salvar alterações
                    </button>
                  </form>
                </article>
              );
            })
          )}
        </div>
      </section>

      <nav className="flex items-center justify-between gap-4" aria-label="Paginação de operadores">
        {directory.page > 1 ? (
          <Link className="rounded-md border border-line px-4 py-2 text-sm" href={directoryHref(directory.filters, directory.page - 1)}>
            Página anterior
          </Link>
        ) : (
          <span />
        )}
        <span className="text-sm text-ink-muted">
          Página {directory.page} de {directory.totalPages}
        </span>
        {directory.page < directory.totalPages ? (
          <Link className="rounded-md border border-line px-4 py-2 text-sm" href={directoryHref(directory.filters, directory.page + 1)}>
            Próxima página
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
