# ADR-0004 — Autenticação e sessões

- **Status:** Aceito parcialmente; provedor pendente
- **Data:** 2026-07-28

## Contexto

O login atual é demonstrativo. É necessário autenticar identidades reais e oferecer sessões seguras antes de módulos com PII.

## Decisão

Adotar autenticação real com identidade verificada, sessões server-side verificáveis, rotacionáveis e revogáveis, cookies seguros/HttpOnly e proteção de login/recovery. Autorização será baseada em Membership/RBAC e não em claims fornecidas pelo cliente. A biblioteca/provedor, métodos iniciais de login, MFA e duração de sessão permanecem pendentes de avaliação de segurança, UX, custo e suporte Vercel/Next.js.

## Consequências

Nenhuma implementação deve escolher provedor implicitamente. A Fase 3 precisa comparar opções, documentar threat model, e-mail, account linking, recovery, CSRF e lifecycle de sessão. Segredos ficam por ambiente. Esta ADR não implementa login.

## Alternativas a avaliar

Solução integrada ao Next.js, serviço gerenciado ou implementação com adapter próprio. JWT armazenado em localStorage e login demo são rejeitados para produção.
