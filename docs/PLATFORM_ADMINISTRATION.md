# Administração da plataforma

A área real `/admin` é dinâmica, sem cache compartilhado e separada das rotas com `tenantSlug`. O acesso deriva exclusivamente de sessão Better Auth, `User` ativa e verificada e `PlatformOperator` `ACTIVE`; nenhuma `Membership` ou role de tenant autoriza a plataforma. Não existe impersonação nem criação de membership por operações administrativas.

Os readers paginam e selecionam somente dados operacionais necessários. Tenants, usuários (e-mail mascarado), billing, filas, auditoria e operadores são exibidos sem CPF, telefone, conteúdo clínico, mensagem, token, credencial, ciphertext, payload ou checkout URL. MRR permanece “Não calculável” enquanto catálogo, preço e ciclo não forem aprovados.

## Bootstrap e operação

`pnpm auth:bootstrap-platform-owner` exige `PLATFORM_OWNER_EMAIL` normalizado, confirmação literal `BOOTSTRAP_PLATFORM_OWNER`, User existente, ativa e verificada. É idempotente apenas para owner já ativo, não cria User, senha ou Membership e grava `AuditLog` global. O último `PLATFORM_OWNER` ativo não pode ser rebaixado, suspenso ou revogado.

A migration é aditiva e revisável; não foi aplicada em production. Esta entrega não configura production, tickets, feature flags, observabilidade externa ou go-live.

## Invariante de PLATFORM_OWNER

Todas as reduções de proprietário utilizável compartilham advisory transaction lock `350035` e transação serializável. Utilizável significa operador OWNER/ACTIVE e User ACTIVE/verificada. PLATFORM_ADMIN não altera User de OWNER; auto-desativação é negada; a existência de ao menos um OWNER utilizável é conferida antes do commit. O lock é constante para serializar todas as variantes da política.
