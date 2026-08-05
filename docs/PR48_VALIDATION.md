# PR 48 — validação

Este PR separa a administração da plataforma do acesso tenant-scoped.

## Critérios

- operador ativo da plataforma é direcionado para `/admin` antes de qualquer exigência de primeiro acesso de tenant;
- usuário sem operador e sem Membership ativa não recebe acesso a dados clínicos;
- clínicas-clientes são provisionadas transacionalmente pelo painel Admin;
- o proprietário inicial recebe senha temporária com troca obrigatória;
- planos comerciais são persistidos e atribuídos às assinaturas;
- suspensão e arquivamento são auditáveis e não removem fisicamente dados clínicos;
- a promoção do primeiro `PLATFORM_OWNER` é manual, idempotente e não usa senha separada;
- nenhum workflow de PR altera production.

## Comandos

```bash
pnpm install --frozen-lockfile
pnpm db:format
pnpm db:validate
pnpm db:generate
pnpm exec vitest run tests/platform-customer-governance.test.ts tests/post-login-routing.test.ts
pnpm check
```
