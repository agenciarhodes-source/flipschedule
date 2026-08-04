# Roadmap da reconstrução do FlipSchedule

> Estado demonstrativo: CRM, Pacientes, Orçamentos, Inbox, Relatórios, Configurações e Administração possuem experiência demonstrativa completa em estado local. Isso não representa persistência, integração, billing ou backend concluídos.

Cada fase só termina com evidências dos critérios. Datas e responsáveis são pendentes de planejamento.

| Fase | Objetivo | Pré-requisitos | Entregáveis | Dependências | Riscos | Critérios de conclusão | Não pertence à fase |
|---|---|---|---|---|---|---|---|
| 0 — Preparação | Tornar requisitos e decisões explícitos | Auditoria e PRD histórico | Fundação documental, ADRs, riscos e pendências | Stakeholders técnicos/produto | Contradições ou escopo inventado | Documentos revisados; baseline preservada; nenhuma mudança funcional | Instalar Next.js, criar banco/deploy |
| 1 — Next.js | Criar shell moderno com equivalência visual | Fase 0 aceita | App Router, TypeScript, Tailwind/shadcn, CI/testes, shell | Decisões de estrutura e package manager | Regressão visual; remoção precoce do protótipo | Quality gates verdes e comparação visual aceita | Banco, auth, integrações, remoção do legado |
| 2 — Neon/Prisma | Estabelecer persistência relacional | Fase 1; modelo conceitual aprovado | Projetos por ambiente, schema, migrations, seed fictício, testes | Neon, Prisma, política de migration | Schema prematuro; perda; cross-tenant | Constraints/testes e migration/restore ensaiados fora de produção | Dados reais, auth completa, módulos finais |
| 3 — Identidade/tenancy | Garantir identidade, sessão, RBAC e isolamento | Fase 2; ADR-0004 resolvido | Auth, Session, Membership, RBAC, tenant context, audit | Provedor de auth/e-mail | IDOR, escalada, sessão insegura | Casos allow/deny e cross-tenant passam; threat model revisado | Asaas, Meta, portabilidade total de telas |
| 4 — Módulos centrais | Entregar fluxos operacionais do MVP | Fase 3 segura; regras detalhadas | Cadastros, pacientes, agenda, CRM, planos, dashboard, inbox base | Dados, tenancy, UX de referência | Concorrência, PII, desvio visual | Critérios por módulo, E2E críticos e aceite visual/produto | Billing e canais externos completos |
| 5 — Asaas | Cobrança recorrente segura | Fase 3; produto comercial definido | Adapter, Subscription/Payment, webhooks, reconciliação/runbook | Conta/sandbox Asaas e decisões comerciais | Cobrança duplicada; entitlement incorreto | Cenários sandbox/idempotência/falha aprovados | Produção/DNS e Meta |
| 6 — Produção/domínios | Preparar operação pública | Fases 1–5 estáveis; domínio decidido | Vercel/Neon prod, DNS, secrets, backup, observabilidade, runbooks | Vercel, Neon, DNS, monitoramento | Migration/deploy acoplados; recuperação falha | Restore/smoke/rollback ensaiados e aprovações registradas | WhatsApp/Meta se ainda não aprovados |
| 7 — WhatsApp/comunicação | Operar atendimento oficial | Segurança/tenancy; aprovação Meta; inbox base | WhatsApp, e-mail, jobs, templates, webhooks/retries | Meta, e-mail, job provider | Bloqueio de conta; opt-in; mensagens duplicadas | Piloto envia/recebe/reconcilia sem cross-tenant | Instagram, Messenger, Lead Ads, IA |
| 8 — Meta/atribuição | Unificar canais e origem de leads | Fase 7 estável; definições de atribuição | Instagram, Messenger, Lead Ads e métricas | Permissões/review Meta | Atribuição incorreta; mudanças da API | Webhooks e reconciliação por tenant aprovados | Novos canais, IA, criativos |
| 9 — Piloto/lançamento | Validar segurança, operação e produto | Todas as fases aplicáveis | Hardening, pentest, LGPD, piloto, go-live checklist | Clínica piloto, jurídico e suporte | Incidente de dados ou indisponibilidade | Aceites explícitos, SLO/alertas/suporte ativos e pendências P0 fechadas | Expansões P1/P2 sem novo planejamento |

## Progresso registrado

- **Relatórios, Configurações e Administração demonstrativos:** `/demo/relatorios`, as subseções de `/demo/configuracoes` e `/demo/admin` possuem experiência demonstrativa completa baseada em fixtures e estado local. Backend, persistência, autenticação administrativa, integrações, billing, jobs e acesso a production permanecem pendentes.

- **Orçamentos e Inbox demonstrativos:** as rotas `/demo/orcamentos`, `/demo/orcamentos/[id]` e `/demo/inbox` possuem experiência demonstrativa completa baseada em fixtures e estado local. Envio real, pagamentos, webhooks, canais externos, persistência, backend e integrações permanecem pendentes.

- **Dashboard e Agenda demonstrativos:** as rotas `/demo/dashboard` e `/demo/agenda` possuem experiência visual demonstrativa completa, baseada somente em mocks e estado local; persistência, banco e integrações não estão concluídos.

- **Fase 1 — migração visual estática implementada, validação ainda bloqueada:** em 2026-07-28 foi confirmado que npm e pnpm apontam para `https://registry.npmjs.org/`, mas o proxy obrigatório do ambiente recusou o túnel HTTPS com HTTP 403. Sem resolução DNS fora do proxy, não foi possível instalar dependências, gerar um lockfile real, iniciar a aplicação ou obter evidência verde dos quality gates e do CI. A fase permanece não concluída; nenhum gate foi dispensado.
- **Fundação de domínios e rotas públicas:** o contrato separa a landing futura (`flipschedule.com.br`) do aplicativo (`app.flipschedule.com.br`), redireciona a raiz do app ao login e reserva telas públicas preparatórias. Isso não conclui landing, autenticação, Neon, checkout, Asaas, billing, deploy ou configuração de domínio.

## Gates transversais

Toda fase exige escopo e critérios antes do código, testes automatizados proporcionais, documentação atualizada, revisão de secrets/PII, evidência de isolamento tenant e plano operacional. Um PR, deploy ou migration isolado não conclui fase.

### Fundação de autenticação

A implementação atual entrega login por e-mail/senha, sessões persistidas, bootstrap controlado do primeiro proprietário, primeiro acesso obrigatório, proteção de rotas privadas e contexto de tenant derivado de membership ativa. Cadastro público e recuperação de senha continuam pendentes.

### Estado detalhado da Fase 2

- **Passo 2A:** implementado no código e aguardando revisão (schema/client/testes/documentação; sem banco ou migration).
- **Passos 2B e 2C:** pendentes; respectivamente provisionamento controlado e migration/constraints revisáveis.

## Registro — fundação visual da demonstração

A fundação visual e navegável pública sob `/demo` foi criada, com application shell compartilhado, navegação desktop/mobile, design system consolidado, nove telas-base e fixtures fictícias isoladas. Este registro confirma somente a arquitetura visual: Dashboard, Agenda, CRM, Pacientes, Orçamentos, Inbox, Relatórios, Configurações e Administração **não estão funcionalmente concluídos** e permanecem nas respectivas fases do roadmap.

## Registro — hardening visual, responsivo e de acessibilidade da demonstração

Em 2026-08-03, as rotas demonstrativas receberam revisão transversal de código e uma **baseline visual revisada**, uma **baseline responsiva revisada** e uma **baseline técnica de acessibilidade implementada**. O registro inclui shell, módulos, recuperação de rotas/registros, foco de drawer, semântica de tabelas, contenção de overflow, alvos de toque e reduced motion. A matriz e as limitações estão em `DEMO_VISUAL_QA_MATRIX.md` e `DEMO_VISUAL_QA_ACCESSIBILITY.md`.

Esse marco não representa certificação WCAG, validação em todos os dispositivos, conclusão de backend, persistência, autenticação, billing, integrações, deploy ou acesso a production. Auditoria manual com tecnologias assistivas e dispositivos reais permanece pendente.

## Fundação de integrações assíncronas (PR 32)

Contratos, fila persistente, ingress, workers pontuais, retry e operação segura foram fundados sem providers reais nem scheduler. Conectar Meta/e-mail, validar contratos oficiais e provisionar scheduler continuam pendentes.

## Billing SaaS em Sandbox (PR 33)

A fundação de billing separa cobrança da assinatura FlipSchedule de pagamentos clínicos, usa catálogo vazio até decisão comercial, checkout Asaas hospedado, credenciais server-only, estados explícitos, idempotência, isolamento tenant e RBAC. Production, migration aplicada, preços comerciais e cobrança de pacientes permanecem pendentes. Consulte `BILLING_AND_ASAAS_INTEGRATION.md`, `BILLING_STATE_MACHINE.md` e `ASAAS_SANDBOX_RUNBOOK.md`.

## Administração segura da plataforma (PR 34)

Foi implementada a base real e separada de `/admin`, com operadores, RBAC próprio, readers sanitizados, grants temporários e hardening de billing/webhooks. Isso não conclui observabilidade externa, tickets, feature flags, impersonação (deliberadamente ausente), Asaas production, piloto ou go-live.

## PR 35 — prontidão operacional (preparação, não go-live)

Configuração, health, hardening HTTP, rate-limit durável, contenção e runbooks foram preparados. Piloto e produção permanecem bloqueados pelo checklist explícito; esta fase não configura infraestrutura nem ativa integrações production.
