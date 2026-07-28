# ADR-0003 — Multi-tenancy por sessão e membership

- **Status:** Aceito
- **Data:** 2026-07-28

## Contexto

O protótipo resolve tenant por slug público e filtra manualmente `tenant_id`, permitindo IDOR. O SaaS precisa isolar clínicas mesmo sob entrada hostil.

## Decisão

Resolver o tenant exclusivamente no servidor a partir de sessão autenticada e `Membership` ativa. Slug/tenant selecionado pelo cliente é apenas uma intenção e deve ser revalidado. Serviços e repositórios recebem contexto tenant confiável; toda relação tenant-scoped é validada e protegida também por constraints quando possível. RBAC e escopos complementam o isolamento.

## Consequências

Queries, cache keys, jobs, storage, webhooks, realtime e auditoria carregam contexto tenant derivado de fonte confiável. Testes negativos cross-tenant são obrigatórios. A estratégia adicional de PostgreSQL/RLS, se adotada, exigirá ADR complementar e não substituirá autorização da aplicação.

## Alternativas consideradas

Confiar no slug; aceitar `tenant_id` do browser; banco por tenant desde o MVP. As duas primeiras são inseguras; a última adiciona complexidade não justificada pelos requisitos atuais.
