# Observabilidade e health checks

## Implementado no PR 35

`/api/health/live` comprova apenas que o processo responde e nunca consulta banco ou provider. `/api/health/ready` usa timeout curto, consulta `SELECT 1`, confirma ao menos uma migration finalizada e valida configuração lazy; responde apenas `ready`, `degraded` ou `unavailable`, checks categóricos, `no-store` e correlation ID. Nenhum host, secret, versão ou dado clínico é exposto.

Logs operacionais seguem allowlist central e redaction; payload, PII, ciphertext, credenciais e URLs sensíveis são proibidos. AuditLog permanece trilha distinta. O diagnóstico `/admin` usa agregados reais; uptime, p95, SLA, taxa de erro e disponibilidade externa são **Não mensurado**.

## Preparado, não ativado

Não há coletor, dashboard, alerta, trace, SLO ou serviço externo. Antes do piloto devem ser definidos responsáveis, retenção, acesso aos logs e alertas. Correlation ID não autentica nem autoriza.

No PR 36 readiness retorna 200 exclusivamente para `ready`; estados `degraded` e `unavailable` retornam 503. O smoke exige simultaneamente HTTP 2xx e payload `status=ready`. Release detalhada não integra health público.
