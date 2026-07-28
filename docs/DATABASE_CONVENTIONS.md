# Convenções de banco de dados

## Tipos e nomenclatura

IDs são UUIDs; nomes internos, tabelas e campos usam inglês. Instantes são `timestamptz(3)`, persistidos em UTC e apresentados no timezone IANA do tenant. Datas civis usam `date`. Dinheiro é `Int` em centavos, nunca `Float`, `Decimal` ou ponto flutuante. Telefones são canônicos E.164 e e-mails são normalizados antes da persistência.

## Dados sensíveis

CPF validado nunca é persistido em texto puro: somente ciphertext e hash produzidos por serviço criptográfico real. Conteúdo clínico, mensagens, payloads e tokens públicos seguem a mesma convenção ciphertext/hash; campos permanecem nulos até o serviço existir. JSON contém somente estrutura variável e não sensível, nunca secrets.

## Tenancy e integridade

`Tenant` é a fronteira de isolamento. Entidades operacionais carregam `tenantId`; referências entre elas usam `@@unique([id, tenantId])` e foreign keys compostas com o mesmo `tenantId`. Slug não autoriza. Índices começam pelo tenant para acessos tenant-scoped. Relações muitos-para-muitos explícitas, como `ProfessionalClinic`, preservam a fronteira.

## Ciclo de vida

Deletes físicos não serão adotados antes da política de retenção, anonimização e cascatas ser aprovada; o padrão inicial é arquivamento/revogação. Mudanças de status relevantes possuem históricos append-only. `WebhookEvent` é idempotente por provider/evento externo. `AuditLog` é trilha de segurança, não log operacional, e seu metadata não contém PII.
