# Runbook Asaas Sandbox

1. Use somente conta e dados fictícios de Sandbox. Sandbox e Produção possuem contas, API keys, webhooks e dados independentes.
2. Guarde API key e token de webhook separados no gerenciador do ambiente. Nunca copie valores para banco, logs ou tickets.
3. Para checkout hospedado, configure `ASAAS_ENVIRONMENT=sandbox`, `EXTERNAL_EFFECTS_MODE=SANDBOX`, `ASAAS_API_KEY`, `ASAAS_CHECKOUT_EXPIRATION_MINUTES` e a origem HTTPS autorizada. Sandbox não exige os gates de produção.
4. Cadastre externamente a rota `/api/webhooks/asaas` somente em ambiente autorizado. O ingresso exige `asaas-access-token`, persiste o evento cifrado/idempotente e processa efeitos de forma assíncrona.
5. Execute reconciliação pontual com `pnpm worker:billing`; o processo limita o lote e termina. Diagnostique somente IDs opacos, correlation ID, status e código sanitizado.
6. Rollback operacional: volte `EXTERNAL_EFFECTS_MODE=DISABLED`, interrompa novas criações de checkout e preserve eventos/pagamentos para reconciliação. Não apague histórico para “corrigir” estado.

## Produção

Produção não é habilitada por este runbook. O código possui suporte fail-closed para produção, mas só aceita efeitos reais quando todos os gates específicos do runbook `ASAAS_PRODUCTION_BILLING_RUNBOOK.md` estão satisfeitos. O kill switch continua `false` por padrão e o rollout inicial exige allowlist de tenants sem wildcard.
