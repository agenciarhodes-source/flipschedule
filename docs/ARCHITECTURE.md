# Arquitetura oficial — FlipSchedule

## Princípios

O alvo é uma aplicação Next.js App Router em TypeScript, implantada na Vercel e apoiada por PostgreSQL Neon via Prisma. A arquitetura é modular por domínio, server-first, segura por padrão e multi-tenant. O protótipo React/FastAPI/MongoDB permanece intacto como referência durante a transição.

## Aplicação e frontend

- Next.js App Router organiza áreas pública, autenticada e administrativa em route groups/layouts.
- React Server Components são o padrão; Client Components são usados apenas para interação/browser APIs.
- Tailwind CSS e shadcn/ui reutilizam a linguagem visual atual. React Hook Form + Zod tratam formulários e validação compartilhável.
- Interface em pt-BR; rotas e nomes internos em inglês quando não afetarem URLs públicas aprovadas.
- Dados sensíveis não entram em props/cache público. Estado de autorização é confirmado no servidor a cada operação.

### Domínios e superfície pública

O aplicativo deste repositório terá endereço canônico `app.flipschedule.com.br`; a landing comercial em `flipschedule.com.br` pertence a outro projeto. A raiz do aplicativo redireciona para `/login`, enquanto `/demo` preserva a experiência visual demonstrativa. Login, recovery, checkout e billing possuem apenas superfícies preparatórias nesta etapa, sem efeitos reais. O contrato detalhado está em `DOMAIN_AND_ROUTE_ARCHITECTURE.md`.

Hostnames e URLs públicas não participam de autorização nem de resolução de tenant. O servidor continuará obrigado a derivar tenant de sessão verificada e Membership ativa quando a Fase 3 implementar identidade.

## Backend e limites de domínio

Route Handlers e Server Actions chamam serviços de domínio server-only. UI, transporte, domínio e persistência ficam separados. Módulos iniciais: identity/access, tenancy/clinics, scheduling, patients/consents, CRM, treatment plans, conversations, billing, integrations e audit. O destino do FastAPI é transicional: ele não será removido antes de equivalência e plano explícito.

## Banco e Prisma

PostgreSQL no Neon é o banco oficial; Prisma é a fonte de schema e migrations. Produção, staging, preview e local não compartilham banco. Foreign keys, unique constraints, checks, índices e transações protegem invariantes. Valores monetários usam inteiros em centavos; instantes usam UTC. Pooling e `DIRECT_DATABASE_URL` para migrations devem seguir orientação Neon/Vercel validada na implementação.

Nenhum schema Prisma é definido nesta fase. A visão conceitual está em `DATA_MODEL_OVERVIEW.md`.

## Autenticação e sessões

Autenticação será real, com provedor/biblioteca ainda pendente no ADR-0004. Sessões devem ser verificáveis no servidor, rotacionáveis e revogáveis; cookies seguros e HttpOnly são preferidos. Recovery, verificação de e-mail, expiração e proteção contra enumeração/abuso são requisitos. Nunca se autoriza por estado client-side.

## Multi-tenancy e RBAC

Após autenticar o `User`, o servidor resolve `Membership` ativa e `Tenant`. Para troca de tenant, valida-se nova membership; nenhum `tenant_id` do cliente é confiável. Repositórios/serviços exigem um contexto tenant confiável e filtram toda entidade tenant-scoped. Relações cross-tenant são proibidas por aplicação e, onde possível, por constraints.

RBAC combina role e permissões por ação/recurso. Escopos adicionais, como “somente própria agenda”, são regras de autorização além da role. Toda decisão sensível ocorre no servidor e pode produzir `AuditLog`.

## Storage e e-mail

Provedores ainda não foram escolhidos. Storage deve ser privado por padrão, usar uploads/downloads assinados de curta duração, validar tipo/tamanho e associar objeto ao tenant sem expor chave de storage. E-mail deve suportar mensagens transacionais, verificação de remetente, webhooks assinados e suppression; dados mínimos e nenhuma informação clínica no assunto/log.

## Webhooks, jobs e realtime

- Endpoints de webhook recebem corpo bruto quando necessário, verificam assinatura/segredo, controlam replay e persistem `WebhookEvent` com chave única antes dos efeitos.
- Resposta rápida precede processamento assíncrono. Retries usam backoff e dead-letter/reconciliação; provedor de jobs será decidido antes da primeira necessidade.
- Jobs recebem IDs opacos e contexto tenant server-side, nunca payload clínico desnecessário.
- Realtime não é requisito universal. Quando necessário para agenda/inbox, entrega notificações autorizadas; a leitura canônica volta ao servidor. Provedor permanece pendente.

## Asaas

Um adapter server-only encapsula clientes, assinaturas, cobranças e webhooks. Chaves nunca chegam ao browser. IDs externos são mapeados ao tenant; eventos são assinados, idempotentes, reconciliáveis e auditados. A aplicação não concede entitlement somente por redirect/retorno do frontend.

## Meta

Adapters separam WhatsApp Cloud API, Instagram, Messenger e Lead Ads. Credenciais e IDs são associados à `Integration` do tenant; tokens são protegidos e rotacionáveis. Webhooks passam por verificação Meta, deduplicação e roteamento tenant seguro. Templates, opt-ins, janelas de atendimento e políticas oficiais são respeitados.

## Observabilidade

Logs estruturados usam request/correlation ID, ambiente e IDs opacos; PII, dados clínicos e secrets são redigidos. Métricas cobrem erros, latência, jobs, webhooks e integrações; traces não capturam payloads sensíveis. Alertas e SLOs serão definidos antes do piloto. `AuditLog` é separado de log operacional.

## Ambientes

Local, preview, staging e production são isolados conforme `ENVIRONMENTS.md`, inclusive banco, secrets, integrações e dados. Preview nunca aponta para produção. Feature flags podem desacoplar deploy de ativação.

## Fluxo de deploy

1. PR executa lint, tipos, testes e análise de segurança; preview usa recursos isolados.
2. Revisão confirma impacto, critérios, migration e rollback/forward-fix.
3. Merge produz artefato/deploy conforme política do ambiente.
4. Migration é uma etapa separada, controlada, observável e explicitamente autorizada.
5. Smoke tests e critérios funcionais validam a feature; só então ocorre ativação/rollout.

PR aberto ≠ deploy concluído ≠ migration aplicada ≠ funcionalidade validada.
