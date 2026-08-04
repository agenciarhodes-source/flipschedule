# Ensaio descartável de backup e restore

## Escopo e contrato

O ensaio automatiza `migrations -> seed sintético idempotente -> pg_dump custom -> banco vazio separado -> pg_restore -> fingerprints -> cenários reais -> limpeza` exclusivamente em PostgreSQL 17 descartável e loopback. Exige `APP_ENV=staging`, `EXTERNAL_EFFECTS_MODE=DISABLED`, confirmação literal, identidade descartável e os nomes fixos `flipschedule_backup_source` e `flipschedule_backup_restore`.

`pnpm ops:backup-restore-rehearsal` pressupõe PostgreSQL 17 já iniciado, a origem já migrada e populada e os clientes `pg_dump`, `pg_restore`, `createdb` e `dropdb` versão 17 no `PATH`. O workflow é a execução completa: aplica migrations somente à origem, executa o seed duas vezes e então chama o agregado. O comando local não alega aplicar migrations.

## Proteções

Os comandos usam `spawn` sem shell e argumentos separados. A senha é entregue apenas por `PGPASSWORD`; nenhuma variável libpq é registrada. O dump custom usa `--no-owner` e `--no-privileges`, nome constante, diretório criado por `mkdtemp`, caminho real confinado, recusa symlink, modo `0600`, tamanho não zero e SHA-256. O `finally` remove recursivamente o diretório temporário. O dump nunca é artifact nem arquivo versionado.

O fingerprint inclui somente versão do contrato/dataset, migration count/digest, contagens agregadas e digest de IDs sintéticos canônicos. A verificação compara origem/destino antes dos cenários, executa resolução por Membership, RBAC allow/deny, serviço real de paciente com tentativa cross-tenant, cálculo real de orçamento, filas, billing, rate limiter com identidade protegida e ausência de efeitos externos. A origem é novamente fingerprintada para provar preservação.

## Limites deliberados

Nenhum backup Neon, restore de staging, restore de production, dado real, provider, Vercel ou ambiente público participa. O dump não é retido. Este ensaio não comprova backup gerenciado pelo provider. RPO, RTO, retenção real, criptografia/política do provider, staging externo e go-live continuam pendentes de decisão e evidência humanas. Este PR não autoriza piloto humano nem production.
