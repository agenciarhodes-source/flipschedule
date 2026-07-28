# Convenções de banco de dados

## Tipos e nomenclatura

IDs são UUIDs; nomes internos, tabelas e campos usam inglês. Instantes são `timestamptz(3)`, persistidos em UTC e apresentados no timezone IANA do tenant. Datas civis usam `date`. Dinheiro é `Int` em centavos, nunca `Float`, `Decimal` ou ponto flutuante. Telefones são canônicos E.164 e e-mails são normalizados antes da persistência.

## Dados sensíveis

CPF validado nunca é persistido em texto puro: somente ciphertext e hash produzidos por serviço criptográfico real. Conteúdo clínico, mensagens, payloads e tokens públicos seguem a mesma convenção ciphertext/hash; campos permanecem nulos até o serviço existir. JSON contém somente estrutura variável e não sensível, nunca secrets.

## Tenancy e integridade

`Tenant` é a fronteira de isolamento. Entidades operacionais carregam `tenantId` obrigatório, mantêm `@@unique([id, tenantId])` quando aplicável e usam índices iniciados pelo tenant. No schema Prisma, relações entre entidades usam o ID específico da entidade, sem reutilizar `tenantId` como relation scalar em relações sobrepostas; relações múltiplas têm nomes explícitos e campos opostos. Relações muitos-para-muitos explícitas, como `ProfessionalClinic`, preservam a fronteira.

Essa representação é uma limitação deliberada do schema Prisma, não uma redução de segurança. Toda query futura receberá `TenantContext` derivado no servidor e todo repositório filtrará por tenant; o slug nunca autoriza. A migration SQL versionada da etapa 2C adicionará as foreign keys compostas extras que garantem igualdade de tenant, e testes de integração tentarão referências e acessos cross-tenant para comprovar a rejeição.

## Ciclo de vida

Deletes físicos não serão adotados antes da política de retenção, anonimização e cascatas ser aprovada; o padrão inicial é arquivamento/revogação. Mudanças de status relevantes possuem históricos append-only. `WebhookEvent` é idempotente por provider/evento externo. `AuditLog` é trilha de segurança, não log operacional, e seu metadata não contém PII.
