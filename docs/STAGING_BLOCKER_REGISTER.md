# Registro sanitizado de blockers

A fonte central é `domains/pilot/staging-blockers.ts`. Blockers nunca são persistidos no banco e evidências não contêm PII ou secrets. Categorias cobrem configuração, banco, migration, autenticação, tenancy, dados sintéticos, smoke, restore, suporte, jurídico, treinamento e segurança. `PILOT_ALLOWLIST_INVALID`, `PILOT_SYNTHETIC_DATA_REQUIRED`, `RESTORE_DATABASE_IDENTITY_INVALID` e `HUMAN_ATTESTATION_INCOMPLETE` falham fechado.
