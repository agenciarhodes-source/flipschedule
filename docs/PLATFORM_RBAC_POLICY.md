# Política RBAC da plataforma

A matriz canônica está em `domains/application/platform/rbac.ts` e é independente do RBAC tenant-scoped.

- `PLATFORM_OWNER`: todas as permissões e proteção do último owner.
- `PLATFORM_ADMIN`: tenants, usuários, sessões, operações, suporte e operadores, sem promover/revogar owner.
- `SUPPORT`: leituras sanitizadas, operação e grants; sem billing ou suspensão de usuário.
- `BILLING`: leitura/reconciliação de billing e entitlements `COURTESY`/`INTERNAL`; sem PII clínica.
- `READONLY`: somente leituras sanitizadas.

Toda mutação reconstrói `PlatformContext`, exige permissão, valida Zod, opera em transação, audita e nunca aceita tenant role como autoridade.
