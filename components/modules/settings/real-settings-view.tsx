import type {
  ClinicSummary,
  OrganizationSettingsView,
  ProcedureSummary,
  ProfessionalSummary,
  ResourceSummary,
  WorkingHoursSummary,
} from "@/domains/application";
import type { CommercialPlanCapacity } from "@/domains/infrastructure/prisma/commercial-plan-quota";
import { updateOrganization } from "@/app/(platform)/[tenantSlug]/settings-actions";
import {
  createScheduleBlock,
  quickCreatePatient,
  saveClinic,
  saveProcedure,
  saveProfessional,
  saveResource,
  saveWorkingHours,
} from "@/app/(platform)/[tenantSlug]/operational-actions";
import { TeamSettings } from "./team-settings";

const input = "rounded-md border border-line bg-bg-elev p-2 text-sm";

async function organizationAction(form: FormData) { "use server"; await updateOrganization(form); }
async function clinic(form: FormData) { "use server"; await saveClinic(form); }
async function procedure(form: FormData) { "use server"; await saveProcedure(form); }
async function professional(form: FormData) { "use server"; await saveProfessional(form); }
async function resource(form: FormData) { "use server"; await saveResource(form); }
async function hours(form: FormData) { "use server"; await saveWorkingHours(form); }
async function block(form: FormData) { "use server"; await createScheduleBlock(form); }
async function patient(form: FormData) { "use server"; await quickCreatePatient(form); }

const Hidden = ({ slug }: { slug: string }) => <input type="hidden" name="tenantSlug" value={slug} />;

export function RealSettingsView({
  organization,
  consentPatients,
  revokedConsents,
  tenantSlug,
  clinics,
  professionals,
  procedures,
  resources,
  workingHours,
  team,
  capacity,
}: {
  organization: OrganizationSettingsView;
  consentPatients: number;
  revokedConsents: number;
  tenantSlug: string;
  clinics: ClinicSummary[];
  professionals: ProfessionalSummary[];
  procedures: ProcedureSummary[];
  resources: ResourceSummary[];
  workingHours: WorkingHoursSummary[];
  team: Awaited<ReturnType<import("@/domains/infrastructure/prisma/team-service").TeamService["read"]>>;
  capacity: CommercialPlanCapacity;
}) {
  const clinicCapacity = capacity.clinics.limit === null
    ? `${capacity.clinics.active} unidade(s) ativa(s) · sem limite contratual`
    : `${capacity.clinics.active}/${capacity.clinics.limit} unidade(s) ativa(s) · ${capacity.clinics.remaining} disponível(is)`;
  const userCapacity = capacity.users.limit === null
    ? `${capacity.users.members} membro(s) + ${capacity.users.pendingInvitations} convite(s) pendente(s) · sem limite contratual`
    : `${capacity.users.reserved}/${capacity.users.limit} vaga(s) de usuário reservada(s) · ${capacity.users.remaining} disponível(is)`;
  const planItems = capacity.managed && capacity.plan
    ? [
        `${capacity.plan.name} (${capacity.plan.code}) · ${capacity.subscriptionStatus}`,
        clinicCapacity,
        userCapacity,
      ]
    : [
        organization.subscription
          ? `${organization.subscription.planCode} · ${organization.subscription.status}`
          : "Sem assinatura comercial vinculada",
        "Tenant legado sem quotas comerciais aplicadas até a atribuição de um plano gerenciado.",
      ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Configuração operacional real</p>
        <h1 className="font-display text-5xl">Configurações</h1>
        <p className="text-sm text-ink-muted">Cadastros isolados por tenant, validados e auditados no servidor.</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Organização" items={[]}>
          <form action={organizationAction} className="grid gap-2">
            <input required name="name" defaultValue={organization.name} aria-label="Nome da organização" className={input} />
            <input required name="timezone" defaultValue={organization.timezone} aria-label="Timezone IANA" className={input} />
            <select name="locale" defaultValue={organization.locale} aria-label="Locale" className={input}>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
            <Submit />
          </form>
        </Section>

        <Section title="Integrações" items={organization.integrations.map((integration) => `${integration.provider} · ${integration.status}`)}>
          <p className="text-xs text-ink-muted">Estado somente leitura obtido das integrações persistidas. Credenciais nunca são exibidas.</p>
        </Section>

        <Section title="Plano, assinatura e capacidade" items={planItems}>
          <p className="text-xs text-ink-muted">Unidades ativas e convites pendentes consomem os limites definidos no plano comercial. Os limites são validados novamente no servidor em cada operação.</p>
          {capacity.clinics.reached || capacity.users.reached ? (
            <p className="mt-2 rounded-md border border-warm/40 bg-warm/5 px-3 py-2 text-xs text-warm">Um ou mais limites do plano foram atingidos. Libere capacidade ou solicite alteração do plano antes de expandir a operação.</p>
          ) : null}
        </Section>

        <Section title="Privacidade e consentimentos" items={[`${consentPatients} pacientes com consentimento vigente`, `${revokedConsents} revogações nos últimos 12 meses`]}>
          <p className="text-xs text-ink-muted">Indicadores agregados; evidências e dados pessoais não são expostos aqui.</p>
        </Section>

        {team ? <TeamSettings data={team} organizationName={organization.name} clinics={clinics} capacity={capacity} /> : null}

        <Section title="Unidades" items={clinics.map((unit) => `${unit.name} · ${unit.active ? "Ativa" : "Inativa"}`)}>
          <p className="mb-3 text-xs text-ink-muted">{clinicCapacity}</p>
          {capacity.clinics.reached ? (
            <p className="mb-3 rounded-md border border-warm/40 bg-warm/5 px-3 py-2 text-xs text-warm">O limite de unidades ativas foi atingido. Uma nova unidade pode ser cadastrada como inativa, mas só poderá ser ativada após liberar capacidade ou alterar o plano.</p>
          ) : null}
          <form action={clinic} className="grid gap-2 sm:grid-cols-2">
            <Hidden slug={tenantSlug} />
            <input required name="name" placeholder="Nome" className={input} />
            <input required name="slug" placeholder="slug-da-unidade" className={input} />
            <input name="timezone" placeholder="Timezone IANA (opcional)" className={input} />
            <Check defaultChecked={!capacity.clinics.reached} />
            <Submit />
          </form>
        </Section>

        <Section title="Profissionais" items={professionals.map((item) => `${item.name} · ${item.specialty}`)}>
          <form action={professional} className="grid gap-2 sm:grid-cols-2">
            <Hidden slug={tenantSlug} />
            <input required name="name" placeholder="Nome" className={input} />
            <input required name="specialty" placeholder="Especialidade" className={input} />
            <input name="registrationNumber" placeholder="Registro" className={input} />
            <input name="registrationRegion" placeholder="UF" className={input} />
            <div className="sm:col-span-2">{clinics.map((unit) => <label className="mr-3 text-xs" key={unit.id}><input type="checkbox" name="clinicIds" value={unit.id} /> {unit.name}</label>)}</div>
            <Check />
            <Submit />
          </form>
        </Section>

        <Section title="Procedimentos" items={procedures.map((item) => `${item.name} · ${item.durationMinutes} min · ${item.priceCents} centavos`)}>
          <form action={procedure} className="grid gap-2 sm:grid-cols-2">
            <Hidden slug={tenantSlug} />
            <input required name="name" placeholder="Nome" className={input} />
            <input name="category" placeholder="Categoria" className={input} />
            <input required type="number" min="5" name="durationMinutes" placeholder="Duração em minutos" className={input} />
            <input required type="number" min="0" name="priceCents" placeholder="Preço em centavos" className={input} />
            <Check />
            <Submit />
          </form>
        </Section>

        <Section title="Salas, cadeiras e equipamentos" items={resources.map((item) => `${item.name} · ${item.kind} · ${item.clinicName}`)}>
          <form action={resource} className="grid gap-2 sm:grid-cols-2">
            <Hidden slug={tenantSlug} />
            <select required name="clinicId" className={input}><option value="">Unidade</option>{clinics.map((unit) => <option value={unit.id} key={unit.id}>{unit.name}</option>)}</select>
            <input required name="name" placeholder="Nome" className={input} />
            <select name="type" className={input}><option value="ROOM">Sala</option><option value="CHAIR">Cadeira</option><option value="EQUIPMENT">Equipamento</option><option value="OTHER">Outro</option></select>
            <Check />
            <Submit />
          </form>
        </Section>

        <Section title="Horários" items={workingHours.map((item) => `${item.weekday}: ${Math.floor(item.startMinute / 60)}:${String(item.startMinute % 60).padStart(2, "0")}–${Math.floor(item.endMinute / 60)}:${String(item.endMinute % 60).padStart(2, "0")}`)}>
          <form action={hours} className="grid gap-2">
            <Hidden slug={tenantSlug} />
            <select required name="professionalId" className={input}><option value="">Profissional</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
            <select required name="clinicId" className={input}><option value="">Unidade</option>{clinics.map((unit) => <option value={unit.id} key={unit.id}>{unit.name}</option>)}</select>
            <textarea required name="slots" defaultValue='[{"weekday":1,"startMinute":480,"endMinute":1080,"active":true}]' className={input} />
            <Submit />
          </form>
        </Section>

        <Section title="Bloqueios de agenda" items={[]}>
          <form action={block} className="grid gap-2 sm:grid-cols-2">
            <Hidden slug={tenantSlug} />
            <select name="clinicId" className={input}><option value="">Unidade (opcional)</option>{clinics.map((unit) => <option value={unit.id} key={unit.id}>{unit.name}</option>)}</select>
            <select name="professionalId" className={input}><option value="">Profissional (opcional)</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
            <select name="resourceId" className={input}><option value="">Recurso (opcional)</option>{resources.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
            <input required type="datetime-local" name="startsAt" className={input} />
            <input required type="datetime-local" name="endsAt" className={input} />
            <input name="reason" placeholder="Motivo" className={input} />
            <Submit />
          </form>
        </Section>

        <Section title="Paciente rápido" items={[]}>
          <form action={patient} className="grid gap-2">
            <Hidden slug={tenantSlug} />
            <input required name="name" placeholder="Nome" className={input} />
            <input name="phoneE164" placeholder="+5511999999999" className={input} />
            <input type="email" name="email" placeholder="E-mail" className={input} />
            <Submit />
          </form>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, items, children }: { title: string; items: string[]; children: React.ReactNode }) {
  return <section className="card-surface p-5"><h2 className="font-display text-2xl">{title}</h2>{items.length ? <ul className="my-3 space-y-1 text-sm text-ink-muted">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="my-3 text-sm text-ink-dim">Nenhum registro.</p>}{children}</section>;
}
function Check({ defaultChecked = true }: { defaultChecked?: boolean }) { return <label className="text-xs"><input type="checkbox" name="active" defaultChecked={defaultChecked} /> Ativo</label>; }
function Submit() { return <button className="rounded-md bg-primary p-2 text-sm text-primary-foreground">Salvar</button>; }
