import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { PlatformAdministrationDirectoryReader } from "@/domains/infrastructure/platform/administration-directory-reader";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";
import {
  changePlatformUserStatusAction,
  revokePlatformUserSessionsAction,
} from "./actions";

export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  "status-updated": "Status global do usuário atualizado e sessões incompatíveis revogadas.",
  "sessions-revoked": "Sessões ativas do usuário revogadas.",
  "self-change-denied": "Sua própria conta não pode ser suspensa por esta tela.",
  "self-revocation-denied": "Use o logout para encerrar sua própria sessão.",
  "confirmation-required": "Para desabilitar, digite exatamente DESABILITAR USUARIO.",
  "owner-protected": "Somente um proprietário da plataforma pode alterar esse usuário.",
  "last-owner-required": "A operação deixaria a plataforma sem um proprietário ativo.",
  "user-not-found": "O usuário não foi encontrado.",
  "access-denied": "Seu papel não permite executar essa operação.",
  invalid: "Não foi possível concluir. Revise os dados e tente novamente.",
  unavailable: "O serviço está temporariamente indisponível.",
};

const userStatusLabel: Record<string, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  DISABLED: "Desabilitado",
};

const membershipStatusLabel: Record<string, string> = {
  INVITED: "Convidado",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  REVOKED: "Revogado",
};

const roleLabel: Record<string, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gestor",
  RECEPTIONIST: "Recepção",
  PROFESSIONAL: "Profissional",
  AGENCY_LEAD: "Agência líder",
  AGENCY_OPS: "Agência operacional",
  AGENCY_READONLY: "Agência leitura",
  PLATFORM_OWNER: "Proprietário da plataforma",
  PLATFORM_ADMIN: "Administrador da plataforma",
  SUPPORT: "Suporte",
  BILLING: "Financeiro",
  READONLY: "Somente leitura",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type SearchParams = {
  q?: string;
  status?: string;
  page?: string;
  result?: string;
};

function directoryHref(
  filters: { q: string; status: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function PlatformUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  noStore();
  const [context, raw] = await Promise.all([getPlatformContext(), searchParams]);
  const reader = new PlatformAdministrationDirectoryReader(getPrismaClient());
  const directory = await reader.users(context, {
    page: raw.page,
    q: raw.q,
    status: raw.status,
  });
  const message = raw.result ? feedback[raw.result] : undefined;
  const returnTo = directoryHref(directory.filters, directory.page);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Identidade e acesso</p>
        <h1 className="mt-2 font-display text-4xl">Usuários da plataforma</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Consulte vínculos, acompanhe o primeiro acesso, altere o estado global da conta e
          encerre sessões comprometidas. E-mails permanecem mascarados nesta área.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <form className="card-surface grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_220px_auto]" method="get">
        <label className="text-sm font-medium">
          Buscar
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={directory.filters.q}
            maxLength={120}
            name="q"
            placeholder="Nome, e-mail, clínica ou slug"
          />
        </label>
        <label className="text-sm font-medium">
          Status global
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={directory.filters.status}
            name="status"
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="SUSPENDED">Suspensos</option>
            <option value="DISABLED">Desabilitados</option>
          </select>
        </label>
        <button className="min-h-11 self-end rounded-md bg-primary px-5 font-medium text-primary-foreground">
          Filtrar
        </button>
      </form>

      <section aria-labelledby="user-directory-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="user-directory-title" className="font-display text-2xl">
              Diretório de acessos
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {directory.total} usuário(s) encontrado(s).
            </p>
          </div>
          <Link className="text-sm font-medium text-primary" href="/admin/operators">
            Gerenciar operadores da plataforma
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {directory.rows.length === 0 ? (
            <p className="card-surface p-6 text-sm text-ink-muted">
              Nenhum usuário corresponde aos filtros informados.
            </p>
          ) : (
            directory.rows.map((user) => {
              const isCurrentUser = user.id === context.userId;
              return (
                <article className="card-surface p-5" key={user.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-2xl">{user.displayName}</h3>
                        {isCurrentUser ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            Sua conta
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 font-mono text-xs text-ink-muted">{user.emailMasked}</p>
                      <p className="mt-3 text-xs text-ink-dim">
                        Criado em {dateTime.format(user.createdAt)} · {user._count.authSessions} sessão(ões)
                        ativa(s) · {user._count.memberships} vínculo(s)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full border border-line px-3 py-1">
                        {userStatusLabel[user.status] ?? user.status}
                      </span>
                      <span className="rounded-full border border-line px-3 py-1">
                        {user.emailVerified ? "E-mail verificado" : "E-mail pendente"}
                      </span>
                      <span className="rounded-full border border-line px-3 py-1">
                        {user.mustChangePassword ? "Primeiro acesso pendente" : "Senha definitiva"}
                      </span>
                    </div>
                  </div>

                  {user.platformOperator ? (
                    <p className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                      Operador: {roleLabel[user.platformOperator.role] ?? user.platformOperator.role} · {user.platformOperator.status}
                    </p>
                  ) : null}

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {user.memberships.length === 0 ? (
                      <p className="rounded-md border border-line p-3 text-sm text-ink-muted">
                        Sem vínculo com clínica.
                      </p>
                    ) : (
                      user.memberships.map((membership) => (
                        <div className="rounded-md border border-line p-3 text-sm" key={membership.id}>
                          <p className="font-medium">{membership.tenant.name}</p>
                          <p className="mt-1 font-mono text-xs text-ink-muted">/{membership.tenant.slug}</p>
                          <p className="mt-2 text-xs text-ink-dim">
                            {roleLabel[membership.role] ?? membership.role} · {membershipStatusLabel[membership.status] ?? membership.status} · clínica {membership.tenant.status}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  {user._count.memberships > user.memberships.length ? (
                    <p className="mt-2 text-xs text-ink-muted">
                      Mais {user._count.memberships - user.memberships.length} vínculo(s) não exibido(s).
                    </p>
                  ) : null}

                  <div className="mt-5 grid gap-4 border-t border-line pt-5 xl:grid-cols-[minmax(0,1fr)_auto]">
                    <form action={changePlatformUserStatusAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <input name="userId" type="hidden" value={user.id} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <label className="text-sm font-medium">
                        Novo status
                        <select
                          className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                          defaultValue={user.status}
                          disabled={isCurrentUser}
                          name="status"
                        >
                          <option value="ACTIVE">Ativo</option>
                          <option value="SUSPENDED">Suspenso</option>
                          <option value="DISABLED">Desabilitado</option>
                        </select>
                      </label>
                      <label className="text-sm font-medium md:col-span-1 xl:col-span-2">
                        Motivo operacional
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                          disabled={isCurrentUser}
                          maxLength={500}
                          minLength={10}
                          name="reason"
                          placeholder="Mínimo de 10 caracteres"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Confirmação ao desabilitar
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3 font-mono text-xs"
                          disabled={isCurrentUser}
                          name="confirmation"
                          placeholder="DESABILITAR USUARIO"
                        />
                      </label>
                      <button
                        className="min-h-10 rounded-md border border-line px-4 text-sm font-medium md:col-span-2 xl:col-span-4"
                        disabled={isCurrentUser}
                      >
                        Atualizar status global
                      </button>
                    </form>

                    <form action={revokePlatformUserSessionsAction} className="self-end">
                      <input name="userId" type="hidden" value={user.id} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <button
                        className="min-h-10 rounded-md border border-warm/40 px-4 text-sm font-medium"
                        disabled={isCurrentUser || user._count.authSessions === 0}
                      >
                        Revogar sessões ({user._count.authSessions})
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <nav className="flex items-center justify-between gap-4" aria-label="Paginação de usuários">
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
