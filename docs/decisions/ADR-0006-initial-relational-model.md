# ADR-0006 — Modelo relacional inicial

- **Status:** Proposto para revisão
- **Data:** 2026-07-28

## Contexto

A reconstrução precisa substituir a persistência documental do protótipo por um modelo oficial que imponha isolamento multi-tenant e integridade relacional.

## Decisão

PostgreSQL Neon e Prisma ORM 7 são o modelo oficial. `Tenant` é a fronteira; toda entidade tenant-scoped mantém `tenantId` obrigatório e `@@unique([id, tenantId])` quando aplicável. `Patient` pertence ao tenant, não a uma clínica. `ProfessionalClinic` representa atuação multi-clínica e sustenta agenda. CRM usa `Pipeline`/`PipelineStage` configuráveis. Dinheiro é inteiro em centavos. CPF, tokens e conteúdo sensível usam somente ciphertext/hash.

`AccessEntitlement` representa direito comercial e permanece separado de `Subscription`, que representa cobrança. Também não representa acesso temporário de suporte: impersonação/suporte exigirá prazo, aprovação, escopo e auditoria próprios em fase posterior. Os enums iniciais codificam apenas estados controlados definidos no Passo 2A.

O schema Prisma representa relações operacionais pelos IDs específicos das entidades e mantém uma relação independente com `Tenant`. Isso evita reutilizar `tenantId` como relation scalar em relações compostas sobrepostas — origem dos 81 erros de validação — sem criar colunas de tenant duplicadas. Relações múltiplas possuem nomes explícitos e campos opostos correspondentes. As foreign keys compostas adicionais que garantem igualdade de tenant serão adicionadas manualmente em SQL versionado na migration 2C, pois expressá-las simultaneamente no Prisma exige sobreposição inválida.

## Consequências e decisões deferidas

A aplicação ainda deve resolver `TenantContext` pela sessão e Membership ativa, aplicar RBAC e exigir que todo repositório filtre por tenant; slug não autoriza e constraints não substituem autorização. Testes de integração negativos cross-tenant são obrigatórios na etapa 2C. Migrations, checks, exclusões de agenda, deleção/anonimização, busca textual/citext, autenticação, criptografia, suporte temporário e cálculo efetivo de entitlement ficam deferidos às fases próprias.

## Estado operacional desta correção

Nenhum banco ou migration foi criado; nenhuma migration, `prisma db push`, configuração Neon/Vercel ou deploy foi executado.
