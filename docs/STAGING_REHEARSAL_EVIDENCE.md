# Evidência do rehearsal de staging

O relatório sanitizado contém versão do schema, ambiente `staging-rehearsal`, SHA completo, release ID, digests SHA-256 de migrations e lockfile, contagem, checks booleanos, timestamp UTC e flags que confirmam dados efêmeros e ausência de acesso ao staging externo. Connection strings, secrets, tokens, usuários, hosts internos, paths, payloads e PII são proibidos.

A evidência de CI não substitui provisionamento, backup/restore, deploy, migration ou smoke humanos no staging externo e nunca aprova piloto ou production.

> PR 38 — Ensaio técnico sintético do piloto: PostgreSQL descartável, dois tenants fictícios, SHA real, migration count dinâmico e efeitos externos bloqueados. Não conclui staging externo, LGPD, piloto humano ou produção.
