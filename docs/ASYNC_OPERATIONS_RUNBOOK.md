# Runbook de operações assíncronas

## Execução segura

Use apenas banco local/teste autorizado. Os comandos pontuais são `pnpm worker:webhooks`, `pnpm worker:messages`, `pnpm worker:reconcile` ou `pnpm worker:once`. Cada um processa no máximo 20 candidatos e encerra. Eles não migram, apagam nem imprimem a URL do banco.

Não execute contra produção neste PR. A proteção rejeita `NODE_ENV=production` ou URL reconhecida como produção sem confirmação externa explícita. Scheduler futuro requer decisão operacional separada.

## Diagnóstico

Observe somente IDs opacos, provider, tentativa, status, código sanitizado, correlation ID e duração. Nunca copie payload, ciphertext, credencial, telefone, e-mail ou CPF para logs/tickets. `PROCESSING` há mais de dez minutos é lease recuperável. `FAILED`, sem `nextAttemptAt`, com erro e cinco tentativas é dead-letter.

Antes de reprocessar, confirme tenant, estado, limite e causa. A ação deve limpar lease, agendar agora, manter o mesmo registro/payload e auditar. Hash divergente no mesmo external event exige revisão, nunca reprocessamento automático.

## Migration e rollback

A migration é aditiva: enum, colunas e índices; não foi aplicada. Validar backup e impacto de lock antes de deploy. PostgreSQL não remove valor de enum com rollback simples; em incidente, fazer forward-fix e deixar workers desativados.

## Billing SaaS em Sandbox (PR 33)

A fundação de billing separa cobrança da assinatura FlipSchedule de pagamentos clínicos, usa catálogo vazio até decisão comercial, checkout Asaas hospedado, credenciais server-only, estados explícitos, idempotência, isolamento tenant e RBAC. Production, migration aplicada, preços comerciais e cobrança de pacientes permanecem pendentes. Consulte `BILLING_AND_ASAAS_INTEGRATION.md`, `BILLING_STATE_MACHINE.md` e `ASAAS_SANDBOX_RUNBOOK.md`.

## Administração e billing

O registry de produção é único para ingress e worker e só inclui Asaas com token de webhook disponível. Evento sem efeito ou desconhecido não é processado como sucesso. Reconciliação continua após falha individual e reporta resumo sanitizado.

## Recuperação de leases

`pnpm ops:cleanup-expired-leases` recupera, em lote limitado, WebhookEvents e Messages em PROCESSING há mais de dez minutos e revoga grants vencidos. Não é daemon, não inicia no import/build e não remove payload/histórico. Antes de production exige aprovação e diagnóstico de workers concorrentes.
