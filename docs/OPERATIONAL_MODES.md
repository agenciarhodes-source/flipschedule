# Modos operacionais e piloto

A política server-only aceita `NORMAL`, `READ_ONLY` e `MAINTENANCE`. `READ_ONLY` bloqueia escrita clínica e preserva leitura, billing, administração, diagnóstico e recuperação. `MAINTENANCE` permite apenas health, administração, billing e recuperação. Valor inválido em production falha fechado; o cliente não participa da decisão.

`resolveTenantOperationalAccess()` centraliza suspensão de tenant e allowlist opcional `PILOT_MODE`/`PILOT_TENANT_SLUGS`. Tenant suspenso preserva dados e acesso mínimo. A allowlist está desativada por padrão e nunca é enviada integralmente ao cliente. A política existe, mas sua aplicação em todos os writers reais ainda requer cobertura completa antes do piloto; não se deve confiar apenas na UI.
