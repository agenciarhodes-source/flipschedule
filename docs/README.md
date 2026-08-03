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
- `memory/PRD.md`: PRD histórico; útil como evidência, não normativo quando divergir desta fundação.

## Governança

`PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `SECURITY_BASELINE.md`, `ENVIRONMENTS.md` e ADRs aceitos são normativos. Mudanças de stack, tenancy, identidade, banco, deploy ou integrações exigem ADR. Pendências não devem ser convertidas em decisão implícita por implementação. Toda tarefa deve consultar `AGENTS.md`, declarar critérios de aceite e atualizar documentos afetados.

## Estado desta fundação

Esta fase é exclusivamente documental. Não foram instalados Next.js, Prisma ou dependências; nenhum serviço, domínio, banco, deploy, autenticação ou integração foi configurado; nenhuma migration foi criada ou executada.
