# ADR-0002 — PostgreSQL Neon e Prisma

- **Status:** Aceito
- **Data:** 2026-07-28

## Contexto

MongoDB no protótipo não tem schema, constraints, índices ou migrations versionados. O produto exige relações, isolamento e evolução reproduzível.

## Decisão

Adotar PostgreSQL no Neon e Prisma ORM como fonte do schema e das migrations. Cada ambiente usa banco/projeto/branch isolado conforme `ENVIRONMENTS.md`. Toda alteração estrutural passa por migration; nenhuma tabela é criada manualmente sem representação Prisma.

## Consequências

Será necessário modelar entidades/constraints, planejar pooling e conexão direta de migration, testar restore e elaborar migração/reconciliação de dados separadamente. Deploy e migration continuam etapas independentes. Esta ADR não cria projeto Neon nem schema Prisma.

## Alternativas consideradas

Manter MongoDB; PostgreSQL sem ORM; outro PostgreSQL gerenciado. Foram rejeitadas para o alvo por não atenderem a decisão explícita de Neon + Prisma ou por reduzirem governança do schema.
