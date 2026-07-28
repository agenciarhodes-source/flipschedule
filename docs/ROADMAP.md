# Roadmap da reconstrução do FlipSchedule

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

- **Fase 1 — migração visual estática implementada, validação pendente:** fundação App Router, design system, shell, landing, login, plano público e sete módulos com dados fictícios tipados estão no código. Instalação, lockfile, quality gates, CI e comparação visual executável permanecem bloqueados por HTTP 403 do registry. A fase não está concluída sem essas evidências.

## Gates transversais

Toda fase exige escopo e critérios antes do código, testes automatizados proporcionais, documentação atualizada, revisão de secrets/PII, evidência de isolamento tenant e plano operacional. Um PR, deploy ou migration isolado não conclui fase.
