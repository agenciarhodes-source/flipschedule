# ADR-0005 — Deploy na Vercel

- **Status:** Aceito
- **Data:** 2026-07-28

## Contexto

A aplicação alvo usa Next.js e precisa de preview, staging e produção isolados. O protótipo depende do ambiente Emergent.

## Decisão

Usar Vercel para hospedar a aplicação Next.js, com configurações e secrets separados por ambiente. PRs poderão gerar previews isolados. Deploy da aplicação, execução de migration, ativação de feature e validação funcional são gates distintos. Domínios serão configurados somente após a decisão registrada em `DOMAIN_STRATEGY.md`.

## Consequências

CI, observabilidade, conexão Neon, jobs de longa duração e webhooks devem respeitar limites/runtime da Vercel. Migrations não serão executadas implicitamente por todo preview nem confundidas com deploy. É necessário runbook de rollback/forward-fix e smoke tests. Esta ADR não cria projeto Vercel ou DNS.

## Alternativas consideradas

Manter hosting Emergent; outras plataformas de container/serverless. Foram rejeitadas como alvo por divergirem da arquitetura oficial, sem impedir serviços auxiliares futuros justificados por ADR.
