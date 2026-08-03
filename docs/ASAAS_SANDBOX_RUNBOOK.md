# Runbook Asaas Sandbox

1. Use somente conta e dados fictícios de Sandbox; não configure production neste estágio.
2. Guarde API key e token de webhook separados no gerenciador do ambiente. Configure `credentialReference` como alias; nunca copie valores para banco, logs ou tickets.
3. Cadastre externamente a rota `/api/webhooks/asaas` somente em ambiente autorizado. O ingresso exige `asaas-access-token`, conta externa vinculada e payload menor que o limite; persiste ciphertext idempotente antes de responder.
4. Execute reconciliação pontual com `pnpm worker:billing`; o processo limita o lote e termina. Production é negada sem confirmação operacional, mas production Asaas continua bloqueada independentemente disso.
5. Diagnostique apenas IDs opacos, correlation ID, status e código sanitizado. Para hash divergente, paralise reprocessamento e investigue replay/adulteração.
6. Rollback operacional: desabilite checkout e worker, não apague eventos/pagamentos, restaure somente após backup e faça forward-fix. Nenhuma migration foi aplicada por este PR.

## Pendências para ativação futura

Aprovar catálogo, billing types, trial, grace period, política de suspensão/cancelamento imediato, conta Sandbox, assinatura do contrato oficial, testes integrados e revisão de segurança. Production exige PR, threat model, secrets, observabilidade e aprovação separados.
