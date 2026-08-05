# Documentação do FlipSchedule

Este diretório é a fonte de contexto para a reconstrução. Código existente não prevalece sobre decisões normativas aceitas, mas continua sendo referência visual e comportamental até equivalência validada.

## Ordem de leitura

1. [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md) — escopo e regras do produto.
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) — arquitetura alvo.
3. [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) — controles mínimos obrigatórios.
4. [`DATA_MODEL_OVERVIEW.md`](DATA_MODEL_OVERVIEW.md) — entidades conceituais.
5. [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) e [`ROADMAP.md`](ROADMAP.md) — sequência de reconstrução.
6. [`ENVIRONMENTS.md`](ENVIRONMENTS.md), [`DOMAIN_STRATEGY.md`](DOMAIN_STRATEGY.md) e [`INTEGRATIONS.md`](INTEGRATIONS.md) — operação e integrações.
7. [`decisions/`](decisions/) — ADRs aceitos e pendências explícitas.

## Baseline histórica

- [`CURRENT_STATE_AUDIT.md`](CURRENT_STATE_AUDIT.md): diagnóstico do protótipo Emergent.
- [`FEATURE_INVENTORY.md`](FEATURE_INVENTORY.md): inventário existente.
- [`MIGRATION_GAP_MATRIX.md`](MIGRATION_GAP_MATRIX.md): lacunas para o alvo.
- [`BASELINE_TEST_RESULTS.md`](BASELINE_TEST_RESULTS.md): resultado reproduzível da baseline.
- [`REAL_TREATMENT_PLANS_AND_INBOX.md`](REAL_TREATMENT_PLANS_AND_INBOX.md): implementação real de orçamentos e conversas, autorização e limitações.
- [`REAL_REPORTS_AND_ORGANIZATION_SETTINGS.md`](REAL_REPORTS_AND_ORGANIZATION_SETTINGS.md): relatórios, configurações institucionais e correção do link público.
- [`DEFINITIVE_RBAC_AND_TEAM_INVITATIONS.md`](DEFINITIVE_RBAC_AND_TEAM_INVITATIONS.md): matriz central de permissões e ciclo seguro de convites e equipe.
- `memory/PRD.md`: PRD histórico; útil como evidência, não normativo quando divergir desta fundação.

## Governança

`PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `SECURITY_BASELINE.md`, `ENVIRONMENTS.md` e ADRs aceitos são normativos. Mudanças de stack, tenancy, identidade, banco, deploy ou integrações exigem ADR. Pendências não devem ser convertidas em decisão implícita por implementação. Toda tarefa deve consultar `AGENTS.md`, declarar critérios de aceite e atualizar documentos afetados.

## Estado desta fundação

Esta fase é exclusivamente documental. Não foram instalados Next.js, Prisma ou dependências; nenhum serviço, domínio, banco, deploy, autenticação ou integração foi configurado; nenhuma migration foi criada ou executada.
- [`INTEGRATIONS_AND_ASYNC_PROCESSING.md`](INTEGRATIONS_AND_ASYNC_PROCESSING.md): fundação segura de integrações, filas e operação assíncrona.
- [`INTEGRATION_PROVIDER_CONTRACT.md`](INTEGRATION_PROVIDER_CONTRACT.md): contrato deny-by-default para adapters.
- [`ASYNC_OPERATIONS_RUNBOOK.md`](ASYNC_OPERATIONS_RUNBOOK.md): execução pontual, diagnóstico e dead-letter.

## PR 39 — rehearsal descartável de backup/restore

[`BACKUP_RESTORE_REHEARSAL.md`](BACKUP_RESTORE_REHEARSAL.md) e [`BACKUP_RESTORE_REHEARSAL_EVIDENCE.md`](BACKUP_RESTORE_REHEARSAL_EVIDENCE.md) definem contrato e evidência do backup/restore técnico em PostgreSQL 17 exclusivamente descartável; não representam backup Neon ou restore externo.

## PR 40 — preparação de staging externo e piloto humano sintético

Os contratos operacionais estão em [`EXTERNAL_STAGING_ACTIVATION.md`](EXTERNAL_STAGING_ACTIVATION.md), [`EXTERNAL_STAGING_VALIDATION_RUNBOOK.md`](EXTERNAL_STAGING_VALIDATION_RUNBOOK.md), [`SYNTHETIC_HUMAN_PILOT_PLAN.md`](SYNTHETIC_HUMAN_PILOT_PLAN.md) e documentos `PILOT_*`. São preparação; nenhuma infraestrutura ou aprovação foi executada.

## PR 41 — fechamento de blockers e ensaio assistido

Consulte [`EXTERNAL_STAGING_ASSISTED_EXECUTION.md`](EXTERNAL_STAGING_ASSISTED_EXECUTION.md), [`EXTERNAL_STAGING_WORKFLOW_MATRIX.md`](EXTERNAL_STAGING_WORKFLOW_MATRIX.md), [`STAGING_BLOCKER_REGISTER.md`](STAGING_BLOCKER_REGISTER.md), [`STAGING_ASSISTED_EVIDENCE.md`](STAGING_ASSISTED_EVIDENCE.md) e [`EXTERNAL_STAGING_SYNTHETIC_DATASET.md`](EXTERNAL_STAGING_SYNTHETIC_DATASET.md). O rehearsal é descartável e não aprova staging ou piloto.
- [`TRANSACTIONAL_EMAIL_DELIVERY.md`](TRANSACTIONAL_EMAIL_DELIVERY.md): contrato provider-neutral, Resend, webhook, idempotência e suppression do PR 43.
- [`ACCOUNT_EMAIL_VERIFICATION.md`](ACCOUNT_EMAIL_VERIFICATION.md): verificação segura do e-mail principal da conta.
