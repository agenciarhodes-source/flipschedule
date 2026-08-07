"use client";

import { useActionState } from "react";

import { updateMemberClinicAccess } from "@/app/(platform)/[tenantSlug]/team-actions";

type ClinicAccessData = NonNullable<Awaited<ReturnType<import("@/domains/infrastructure/prisma/clinic-access-management").ClinicAccessManagementService["read"]>>>;
type TeamData = NonNullable<Awaited<ReturnType<import("@/domains/infrastructure/prisma/team-service").TeamService["read"]>>>;

const field="min-h-10 rounded-md border border-line bg-bg-elev px-3 text-sm";
const roleLabel:Record<string,string>={OWNER:"Proprietário",MANAGER:"Gestor",RECEPTIONIST:"Recepção",PROFESSIONAL:"Profissional",AGENCY_LEAD:"Agência (liderança)",AGENCY_OPS:"Agência (operação)",AGENCY_READONLY:"Agência (leitura)"};

export function ClinicAccessSettings({data,team}:{data:ClinicAccessData;team:TeamData}) {
  const editable=team.members.filter((member)=>member.role!=="OWNER"&&member.role!=="MANAGER");
  return <section className="card-surface p-5 lg:col-span-2">
    <h2 className="font-display text-2xl">Acesso por unidade</h2>
    <p className="mt-1 text-sm text-ink-muted">Proprietários e gestores enxergam todas as unidades. Os demais papéis só enxergam e operam nas unidades explicitamente liberadas.</p>
    <div className="mt-4 space-y-3">
      {editable.length===0?<p className="text-sm text-ink-dim">Nenhum membro com acesso restrito por unidade.</p>:editable.map((member)=><MemberClinicAccess key={member.id} member={member} data={data}/>) }
    </div>
  </section>;
}

function MemberClinicAccess({member,data}:{member:TeamData["members"][number];data:ClinicAccessData}) {
  const [state,action,pending]=useActionState(updateMemberClinicAccess,null);
  const selected=new Set(data.byMembership[member.id]??[]);
  return <div className="rounded-md border border-line p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><strong>{member.user.displayName}</strong><p className="text-xs text-ink-muted">{roleLabel[member.role]??member.role} · {member.status}</p></div>
      <span className="text-xs text-ink-dim">{selected.size} unidade(s) liberada(s)</span>
    </div>
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="id" value={member.id}/>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.clinics.map((clinic)=><label key={clinic.id} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
          <input type="checkbox" name="clinicIds" value={clinic.id} defaultChecked={selected.has(clinic.id)} disabled={clinic.status!=="ACTIVE"}/>
          <span>{clinic.name}<span className="ml-1 text-xs text-ink-dim">/{clinic.slug}{clinic.status!=="ACTIVE"?" · inativa":""}</span></span>
        </label>)}
      </div>
      <button disabled={pending} className={field}>{pending?"Salvando…":"Salvar acesso às unidades"}</button>
      {state&&!state.ok?<p role="alert" className="text-sm text-warm">{state.message}</p>:null}
      {state?.ok?<p role="status" className="text-sm text-primary">Acesso por unidade atualizado.</p>:null}
    </form>
  </div>;
}
