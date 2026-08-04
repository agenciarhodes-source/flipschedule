# Threat model operacional — atualização PR 35

Ativos: identidade, sessões, PII/saúde, isolamento tenant, billing, credenciais, eventos e auditoria. Fronteiras: browser/cookie, rotas públicas, webhook/provider, workers, PostgreSQL e administração da plataforma.

Ameaças prioritárias: IDOR/cross-tenant por IDs externos; CSRF; brute force/abuso; replay e payload adulterado; owner lockout concorrente; vazamento por log/health/erro; SSRF/origem incorreta; indisponibilidade por fila/lease; mistura sandbox/production; operador privilegiado. Controles preparados: contexto confiável, constraints tenant-provider, assinatura/idempotência, HMAC rate bucket, origin check, correlation limitado/redaction, headers, modes, lock transacional, runbooks.

Riscos residuais bloqueantes: aplicação integral do limiter e guards; teste concorrente em PostgreSQL real; restore; alertas externos; pentest; revisão jurídica/LGPD; recuperação/Better Auth abuse controls; infraestrutura/secrets/TLS. Revisão humana formal do threat model ainda não ocorreu.
