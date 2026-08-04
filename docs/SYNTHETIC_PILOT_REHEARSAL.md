# Ensaio técnico sintético do piloto

Automatiza em PostgreSQL 17 descartável uma verificação técnica do FlipSchedule com dados exclusivamente fictícios, RBAC central, isolamento tenant, modos operacionais e efeitos externos desabilitados. Não é piloto humano, homologação, aprovação LGPD, staging externo, go-live ou produção.

O dataset `1.0.0` cria `piloto-sintetico` (único slug da allowlist) e `controle-sintetico`, sete personas e fundação clínica marcada por `[SINTÉTICO]`. CPF e telefone ficam nulos; e-mails usam `example.test`. O relógio é `2030-06-17T12:00:00.000Z`.

O workflow faz checkout de `github.sha`, compara esse SHA ao manifest, calcula migrations no código e banco, executa seed duas vezes, 18 cenários, integridade, testes e build. `externalCallsAttempted` deve ser zero. Falha crítica interrompe dependentes; qualquer falha reprova o job. O relatório efêmero não contém IDs, PII, credenciais, tokens, ciphertext, payload ou conexão.

“Ensaio técnico sintético concluído. Nenhum piloto humano, staging externo ou ambiente de produção foi validado.”
