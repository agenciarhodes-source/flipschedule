# Integrações e processamento assíncrono

## Escopo e critérios de aceite

Esta fundação separa contratos de aplicação, infraestrutura server-only e apresentação. O aceite exige isolamento por `tenantId`, RBAC no servidor, configuração estrita sem secrets, payload cifrado, claims atômicos, retry finito e nenhuma confirmação fictícia. Nenhum adapter externo está registrado: WhatsApp, Instagram, Messenger, Facebook Leads e e-mail aparecem como **Ainda não configurado**.

## Fluxos duráveis

O ingress limita o corpo, valida o provider, exige verificação pelo adapter antes de resolver a `Integration`, calcula SHA-256, cifra com AES-256-GCM e persiste `WebhookEvent`. A unique `provider + externalEventId` oferece idempotência. Hash divergente nunca sobrescreve o evento. O request não processa efeitos longos.

Mensagens externas são a própria fila: `PENDING → PROCESSING` por `updateMany` condicional. Apenas o claimant resolve credencial, descriptografa, verifica destinatário e consentimento e chama o adapter. `SENT` exige `externalMessageId` confirmado. Entrega/leitura dependem de evento posterior. Lease de dez minutos pode ser recuperado.

Retries usam atrasos aproximados de 30 s, 2 min, 10 min, 30 min e 60 min, jitter limitado a ±20% e máximo de cinco tentativas. Falha esgotada/permanente fica `FAILED`, sem próxima tentativa e com código sanitizado. Reprocessamento futuro deve exigir `integrations.manage`, preservar payload e ser tenant-scoped.

## Segurança e limitações

`credentialReference` aceita somente alias `env:NAME`; o valor é resolvido em runtime e nunca segue ao cliente. `configuration` rejeita nomes de segredo. Correlation IDs são UUIDs sem PII. Logs operacionais aceitam somente allowlist. Sem `FIELD_ENCRYPTION_KEY` válida o ingress rejeita, sem fallback em texto puro.

Não há scheduler, daemon, Meta/WhatsApp/e-mail real, Asaas, billing, chamada externa, configuração de produção ou migration aplicada. Scripts executam um lote e terminam; produção exige `ALLOW_PRODUCTION_WORKER=true` explícito.

## Billing SaaS em Sandbox (PR 33)

A fundação de billing separa cobrança da assinatura FlipSchedule de pagamentos clínicos, usa catálogo vazio até decisão comercial, checkout Asaas hospedado, credenciais server-only, estados explícitos, idempotência, isolamento tenant e RBAC. Production, migration aplicada, preços comerciais e cobrança de pacientes permanecem pendentes. Consulte `BILLING_AND_ASAAS_INTEGRATION.md`, `BILLING_STATE_MACHINE.md` e `ASAAS_SANDBOX_RUNBOOK.md`.
