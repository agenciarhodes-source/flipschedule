"use client";

import { useActionState, useState } from "react";
import {
  inviteMember,
  revokeInvitation,
  rotateInvitation,
  transferOwnership,
  updateMemberRole,
  updateMemberStatus,
} from "@/app/(platform)/[tenantSlug]/team-actions";
import type { ClinicSummary } from "@/domains/application";

type TeamData = NonNullable<
  Awaited<ReturnType<import("@/domains/infrastructure/prisma/team-service").TeamService["read"]>>
>;

type UserCapacity = {
  managed: boolean;
  users: {
    members: number;
    pendingInvitations: number;
    reserved: number;
    limit: number | null;
    remaining: number | null;
    reached: boolean;
  };
};

const roles = [
  "MANAGER",
  "RECEPTIONIST",
  "PROFESSIONAL",
  "AGENCY_LEAD",
  "AGENCY_OPS",
  "AGENCY_READONLY",
];
const label: Record<string, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gestor",
  RECEPTIONIST: "Recepção",
  PROFESSIONAL: "Profissional",
  AGENCY_LEAD: "Agência (liderança)",
  AGENCY_OPS: "Agência (operação)",
  AGENCY_READONLY: "Agência (leitura)",
};
const field = "min-h-10 rounded-md border border-line bg-bg-elev px-3 text-sm";

export function TeamSettings({
  data,
  organizationName,
  clinics,
  capacity,
}: {
  data: TeamData;
  organizationName: string;
  clinics: ClinicSummary[];
  capacity: UserCapacity;
}) {
  const [state, action, pending] = useActionState(inviteMember, null);
  const [role, setRole] = useState("RECEPTIONIST");
  const tenantWide = role === "MANAGER";
  const quotaReached = capacity.managed && capacity.users.reached;
  const capacityText = capacity.users.limit === null
    ? `${capacity.users.members} membro(s) + ${capacity.users.pendingInvitations} convite(s) pendente(s) · sem limite contratual`
    : `${capacity.users.reserved}/${capacity.users.limit} vaga(s) reservada(s) · ${capacity.users.remaining} disponível(is)`;

  return (
    <section className="card-surface p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Equipe e acessos</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Convites definem papel, unidades liberadas e reservam uma vaga do plano até aceite, revogação ou expiração.
          </p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs font-medium">
          {capacityText}
        </span>
      </div>

      {quotaReached ? (
        <p className="mt-4 rounded-md border border-warm/40 bg-warm/5 px-3 py-2 text-sm text-warm" role="status">
          O limite de usuários do plano foi atingido. Revogue um convite ou acesso, ou altere o plano para convidar outra pessoa.
        </p>
      ) : null}

      <form action={action} className="mt-4 grid gap-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className={field}
            required
            type="email"
            name="email"
            placeholder="pessoa@exemplo.com"
            aria-label="E-mail do convite"
            disabled={quotaReached || pending}
          />
          <select
            className={field}
            name="role"
            aria-label="Papel inicial"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={quotaReached || pending}
          >
            {roles.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {label[roleOption]}
              </option>
            ))}
          </select>
          <button
            disabled={pending || quotaReached}
            className="rounded-md bg-primary px-4 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Gerando…" : quotaReached ? "Limite atingido" : "Gerar convite"}
          </button>
        </div>
        {tenantWide ? (
          <p className="text-xs text-ink-muted">
            Gestores recebem acesso a todas as unidades da organização.
          </p>
        ) : (
          <fieldset className="rounded-md border border-line p-3" disabled={quotaReached || pending}>
            <legend className="px-1 text-xs font-semibold">Unidades liberadas</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {clinics.filter((clinic) => clinic.active).map((clinic) => (
                <label key={clinic.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="clinicIds" value={clinic.id} />
                  <span>{clinic.name}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-dim">
              Selecione ao menos uma unidade para papéis restritos.
            </p>
          </fieldset>
        )}
      </form>

      {state && !state.ok ? (
        <p role="alert" className="mt-2 text-sm text-warm">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? <CopyLink url={state.data.url} /> : null}

      <h3 className="mt-6 font-display text-xl">Membros</h3>
      <div className="mt-2 space-y-2">
        {data.members.map((member) => (
          <div className="rounded-md border border-line p-3" key={member.id}>
            <div>
              <strong>{member.user.displayName}</strong>
              <p className="text-xs text-ink-muted">
                {member.user.emailNormalized} · {label[member.role]} · {member.status}
              </p>
            </div>
            {member.role !== "OWNER" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Action action={updateMemberRole} id={member.id}>
                  <select name="role" defaultValue={member.role} className={field}>
                    {roles.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {label[roleOption]}
                      </option>
                    ))}
                  </select>
                  <button className={field}>Alterar papel</button>
                </Action>
                <Action
                  action={updateMemberStatus}
                  id={member.id}
                  extra={{ status: member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }}
                  label={member.status === "ACTIVE" ? "Suspender" : "Reativar"}
                />
                <Action
                  action={updateMemberStatus}
                  id={member.id}
                  extra={{ status: "REVOKED" }}
                  label="Revogar acesso"
                />
                <Action action={transferOwnership} id={member.id}>
                  <input
                    className={field}
                    name="confirmation"
                    placeholder={organizationName}
                    aria-label="Nome da organização para confirmação"
                  />
                  <button className={field}>Transferir propriedade</button>
                </Action>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-display text-xl">Convites</h3>
      <div className="mt-2 space-y-2">
        {data.invitations.length ? (
          data.invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line p-3 text-sm"
            >
              <span>
                {invitation.emailNormalized} · {label[invitation.role]} · {invitation.state} · expira em {invitation.expiresAt.toISOString().slice(0, 10)}
              </span>
              {invitation.state === "PENDING" ? (
                <span className="flex gap-2">
                  <RotateAction id={invitation.id} />
                  <Action action={revokeInvitation} id={invitation.id} label="Revogar" />
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-ink-dim">Nenhum convite.</p>
        )}
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer font-display text-xl">Histórico de alterações</summary>
        <ul className="mt-2 space-y-1 text-xs text-ink-muted">
          {data.history.map((history) => (
            <li key={history.id}>
              {history.occurredAt.toISOString()} · {history.action} · {history.resourceType}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Action({
  action,
  id,
  label: buttonLabel,
  extra,
  children,
}: {
  action: (state: unknown, data: FormData) => Promise<unknown>;
  id: string;
  label?: string;
  extra?: Record<string, string>;
  children?: React.ReactNode;
}) {
  const [, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex gap-1">
      <input type="hidden" name="id" value={id} />
      {Object.entries(extra ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {children ?? (
        <button disabled={pending} className={field}>
          {pending ? "Processando…" : buttonLabel}
        </button>
      )}
    </form>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
      <p className="break-all text-xs">{url}</p>
      <button
        type="button"
        className="mt-2 text-sm font-medium text-primary"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        }}
      >
        {copied ? "Link copiado" : "Copiar link manual"}
      </button>
    </div>
  );
}

function RotateAction({ id }: { id: string }) {
  const [state, action, pending] = useActionState(rotateInvitation, null);
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button disabled={pending} className={field}>
          {pending ? "Rotacionando…" : "Rotacionar link"}
        </button>
      </form>
      {state && !state.ok ? (
        <p role="alert" className="mt-2 text-xs text-warm">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <div>
          <p role="status" className="mt-2 text-xs">
            O link anterior foi invalidado.
          </p>
          <CopyLink url={state.data.url} />
        </div>
      ) : null}
    </div>
  );
}
