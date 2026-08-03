# Runbook de operações da plataforma

Operadores autorizados podem inspecionar estados, tentativas, leases, correlation IDs e códigos sanitizados de webhooks, mensagens e billing. Nunca devem carregar ou copiar payload, body cifrado, credencial ou PII. Retry deve reutilizar os serviços/leases existentes e atuar pelo ID opaco validado; não existe lógica paralela nem impersonação.

Eventos Asaas desconhecidos ficam `FAILED` com `WEBHOOK_EVENT_UNSUPPORTED` e exigem revisão. Status desconhecidos preservam o estado local e a reconciliação falha explicitamente. O lote isola falhas por assinatura e retorna contagens e códigos sanitizados. Production permanece bloqueada; migration, deploy e ativação são etapas independentes.
