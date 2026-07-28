# Relatório do schema — Passo 2A

## Escopo e estado

O Passo 2A define o schema Prisma 7, geração explícita do client e adapter Neon server-only. Não cria/configura Neon, banco, tabela, seed ou migration e não conecta telas. Estado: **implementado no código e aguardando revisão**; a Fase 2 não está concluída.

## Dependências

Declaradas: Prisma CLI/Client/adapter Neon 7.2.0, `@neondatabase/serverless` 1.0.2, `server-only` 0.0.1, `dotenv` 17.2.3 e `tsx` 4.21.0. A instalação no ambiente foi bloqueada por HTTP 403 do registry e deve ser confirmada pelo lockfile/CI antes da aprovação.

## Modelo, enums e relações

São 30 modelos: identidade/tenancy (`User`, `Tenant`, `Clinic`, `Membership`, `AccessEntitlement`); operação (`Professional`, `ProfessionalClinic`, `Resource`, `Procedure`, `WorkingHours`, `ScheduleBlock`); LGPD (`Patient`, `Consent`); CRM (`Pipeline`, `PipelineStage`, `Lead`, históricos e atribuição); agenda; planos; comunicação; integrações, cobrança, webhook e auditoria. Enums cobrem status, roles, consentimento, canais, providers e outcomes descritos no requisito.

Entidades tenant-scoped possuem `tenantId`, identidade composta alternativa e FKs compostas. Appointment e WorkingHours referenciam `ProfessionalClinic`; relações de paciente, clínica, profissional, procedimento, recurso, lead, planos, conversas e histories carregam o mesmo tenant.

## Decisões e riscos

Pipeline é configurável; Patient pertence ao tenant; entitlement comercial é separado de Subscription e suporte; money usa centavos; material sensível usa ciphertext/hash. Riscos restantes: revisão da densidade de índices, comportamento de uniques com nulos, política de deleção, criptografia/secret manager e validação do schema com binário Prisma no CI.

## Invariantes deferidas para 2C

Checks: `endsAt > startsAt`; money não negativo; duração e quantidade positivas; desconto e consistência financeira de plano/item; limites de WorkingHours; alvo de ScheduleBlock; ator de AuditLog. Também: exclusion constraints para Professional/Resource, `btree_gist`, índices adicionais, possível `citext`, busca por nome e política de deleção/anonimização.

## Próximos passos

2B provisiona ambientes Neon isolados somente após revisão. 2C cria migration revisável com checks/extensões/índices, plano de execução e rollback/forward-fix.

## Comandos e resultados

Os comandos de quality gate estão registrados no relatório final do PR. Nesta cópia, a consulta web oficial e o download do registry retornaram 401/403; nenhuma conexão de banco foi tentada.
