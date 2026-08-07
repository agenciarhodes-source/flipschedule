# Multiunidade e escopo por clínica

## Objetivo

O FlipSchedule trata `Tenant` como a organização cliente e `Clinic` como uma unidade operacional. A autorização por unidade complementa o RBAC do tenant e evita que profissionais, recepção e equipes externas consultem ou alterem dados operacionais de filiais às quais não foram vinculados.

## Política

- `OWNER` e `MANAGER` possuem acesso tenant-wide a todas as unidades da organização.
- `RECEPTIONIST`, `PROFESSIONAL`, `AGENCY_LEAD`, `AGENCY_OPS` e `AGENCY_READONLY` dependem de `MembershipClinicAccess` ativo.
- O escopo é aplicado no servidor para unidades, profissionais vinculados, recursos, horários e agendamentos.
- Leituras com `clinicId` fora do escopo retornam conjunto vazio ou `null`.
- Escritas em unidade fora do escopo falham com acesso negado.
- Transições e reagendamentos validam a unidade do agendamento persistido; o cliente não escolhe o escopo por ID livre.
- Bloqueios sem unidade só são permitidos para papéis tenant-wide.

## Convites

Papéis restritos recebem uma lista explícita de unidades no momento do convite. O escopo é persistido em `TenantInvitationClinicAccess` e copiado para `MembershipClinicAccess` dentro da mesma transação que aceita o convite.

Convites antigos ainda pendentes são retrocompatibilizados na migration com todas as unidades ativas do tenant, preservando o comportamento anterior. Novos convites exigem ao menos uma unidade para papéis restritos.

## Administração

A tela de configurações permite que `OWNER` e `MANAGER` substituam o conjunto de unidades de um membro restrito. A operação:

- valida tenant, membership e clínicas no servidor;
- usa transação serializável;
- desativa vínculos antigos e reativa/cria os selecionados;
- registra `team.member.clinic_access_replaced` em auditoria;
- não registra dados pessoais ou texto livre do operador.

## Rollout

A migration `20260807010000_add_membership_clinic_access` cria os dois modelos de escopo e faz backfill de memberships ativas e convites pendentes para todas as unidades ativas existentes. Isso evita perda de acesso ao habilitar a política.

A produção deve estar com todas as migrations anteriores aplicadas antes desta migration ser promovida.

## Limites deste PR

- Procedimentos continuam tenant-wide; a disponibilidade por unidade será tratada em evolução específica de catálogo/agenda.
- Pacientes e CRM permanecem tenant-wide porque o modelo atual não atribui um paciente a uma única unidade.
- O escopo não substitui RBAC: a membership precisa ter simultaneamente permissão funcional e acesso à unidade.
