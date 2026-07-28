# Visão conceitual do modelo de dados

Este documento não é schema Prisma, migration ou autorização para criar tabelas. Nomes internos estão em inglês e podem mudar mediante revisão do domínio.

## Identidade, acesso e tenancy

| Entidade | Propósito | Relações principais |
|---|---|---|
| `User` | Identidade global autenticável | Possui `Session` e `Membership` |
| `Session` | Sessão revogável/expirável | Pertence a `User`; contexto selecionado é validado contra Membership |
| `Tenant` | Organização SaaS e fronteira de isolamento | Possui Clinics, Memberships e dados operacionais |
| `Clinic` | Unidade física/lógica dentro do tenant | Pertence a Tenant; relaciona agenda/profissionais conforme regra futura |
| `Membership` | Vínculo de User a Tenant | Pertence a User, Tenant e Role; possui status/escopo |
| `Role` | Conjunto nomeado de permissões | Aplicado por Membership; roles customizadas são decisão pendente |
| `AccessGrant` | Concessão excepcional e limitada, como suporte | Ator, tenant, escopo, justificativa, expiração e revogação |

`tenantId` existe nas entidades tenant-scoped, mas nunca é aceito do navegador como autoridade. Relações e índices/constraints devem impedir vínculos entre tenants.

## Operação clínica/comercial

| Entidade | Propósito | Relações principais |
|---|---|---|
| `Professional` | Profissional que atende | Tenant; opcionalmente User/Membership; Clinics, WorkingHours, Appointments |
| `Resource` | Cadeira, sala ou equipamento | Tenant/Clinic; usado por Appointment |
| `Procedure` | Catálogo de procedimentos | Tenant; duração e preço padrão em centavos |
| `WorkingHours` | Janela recorrente de disponibilidade | Professional e/ou Clinic; timezone interpretado explicitamente |
| `ScheduleBlock` | Indisponibilidade/exceção | Tenant, Professional/Resource/Clinic e intervalo UTC |
| `Patient` | Pessoa atendida/contato | Tenant; Consents, Leads, Appointments, TreatmentPlans, Conversations |
| `Consent` | Evidência versionada de consentimento/finalidade | Tenant, Patient, finalidade, base/versão, timestamps e revogação |
| `Lead` | Oportunidade comercial | Tenant, Patient, origem, stage e responsável |
| `Appointment` | Reserva de agenda | Tenant, Clinic, Patient, Professional, Procedure/Resource; intervalo UTC e status |
| `TreatmentPlan` | Proposta/orçamento e seus itens versionáveis | Tenant, Patient, Professional/Lead; valores em centavos, status e acesso público seguro |
| `Conversation` | Thread por canal/contato | Tenant, Patient/Lead, Integration e Messages |
| `Message` | Mensagem inbound/outbound | Conversation/Tenant; ID externo, direção, status, conteúdo sob retenção |

Itens de plano e histórico de estágio/status poderão exigir entidades próprias; a decisão ocorrerá no schema da Fase 2/4.

## Integrações, billing e governança

| Entidade | Propósito | Relações principais |
|---|---|---|
| `Integration` | Configuração de provedor/canal do tenant | Tenant, tipo, status, identificadores externos e referência segura a credenciais |
| `Subscription` | Assinatura do tenant | Tenant, provedor/plano, IDs externos, status e períodos UTC |
| `Payment` | Cobrança/pagamento | Tenant, Subscription, valor em centavos, status, vencimento e ID externo |
| `WebhookEvent` | Inbox idempotente de eventos externos | Provider, external ID único, tenant resolvido, estado/tentativas e timestamps |
| `AuditLog` | Trilha de ações sensíveis | Tenant, ator, ação, recurso opaco, resultado e timestamp UTC; sem payload clínico comum |

## Invariantes conceituais

- IDs externos são únicos no escopo correto do provedor; eventos são idempotentes.
- Money é inteiro em centavos; instantes são UTC; timezone IANA pertence ao Tenant/Clinic conforme decisão futura.
- Telefone canônico é E.164. CPF válido é dado sensível e deve ter minimização/proteção; unicidade/deduplicação depende de regra aprovada.
- Exclusões precisam conciliar LGPD, integridade referencial, obrigações financeiras e auditoria; soft delete não é solução automática.
- Status são enums/transições controladas, não strings arbitrárias.

## Pendências antes do schema

Provedor e modelo de sessão; catálogo exato de roles/permissões; cardinalidade Professional–Clinic; regras completas de conflito; deduplicação de Patient; versionamento de TreatmentPlan; retenção/criptografia de mensagens e CPF; estratégia de audit immutability; isolamento adicional no PostgreSQL; RPO/RTO e política de exclusão.
