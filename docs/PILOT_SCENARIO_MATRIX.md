# Matriz do ensaio técnico sintético do piloto

| Cenários | Verificação real |
|---|---|
| bootstrap, autenticação, cross-tenant | Prisma, Membership e filtro tenant |
| organização, equipe, CRM/pacientes, agenda, orçamento, Inbox, relatórios | políticas e serviços da aplicação |
| billing e plataforma | RBAC tenant/platform; nenhuma cobrança |
| RBAC, modos operacionais, allowlist | políticas centrais server-side |
| filas, rate limiting, integridade | leases, HMAC e invariantes finais |

São 18 IDs estáveis. A matriz não redefine permissões: `domains/application/rbac.ts` e a política platform são as autoridades.
