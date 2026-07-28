# ADR-0006 — Modelo relacional inicial

- **Status:** Proposto para revisão
- **Data:** 2026-07-28

## Contexto

A reconstrução precisa substituir a persistência documental do protótipo por um modelo oficial que imponha isolamento multi-tenant e integridade relacional.

## Decisão

PostgreSQL Neon e Prisma ORM 7 são o modelo oficial. `Tenant` é a fronteira; relações operacionais usam chaves estrangeiras compostas. `Patient` pertence ao tenant, não a uma clínica. `ProfessionalClinic` representa atuação multi-clínica e sustenta agenda. CRM usa `Pipeline`/`PipelineStage` configuráveis. Dinheiro é inteiro em centavos. CPF, tokens e conteúdo sensível usam somente ciphertext/hash.

`AccessEntitlement` representa direito comercial e permanece separado de `Subscription`, que representa cobrança. Também não representa acesso temporário de suporte: impersonação/suporte exigirá prazo, aprovação, escopo e auditoria próprios em fase posterior. Os enums iniciais codificam apenas estados controlados definidos no Passo 2A.

## Consequências e decisões deferidas

A aplicação ainda deve resolver tenant pela sessão e aplicar RBAC; constraints não substituem autorização. Migrations, checks, exclusões de agenda, deleção/anonimização, busca textual/citext, autenticação, criptografia, suporte temporário e cálculo efetivo de entitlement ficam deferidos às fases próprias.
