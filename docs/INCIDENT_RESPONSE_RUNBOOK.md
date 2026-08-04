# Runbook de resposta a incidentes

1. Classificar impacto sem copiar PII para tickets ou logs e registrar horário UTC/correlation IDs.
2. Conter com `READ_ONLY`, `MAINTENANCE`, suspensão tenant-scoped, interrupção dos workers ou rotação/revogação externa feita por operador autorizado.
3. Preservar AuditLog, eventos cifrados e evidências; não apagar histórico financeiro.
4. Investigar por IDs opacos e confirmar isolamento tenant, assinatura, replay e efeitos idempotentes.
5. Recuperar por forward-fix/rollback aprovado; migrations destrutivas não são rollback automático.
6. Validar health, smoke em ambiente autorizado e consistência; comunicar conforme plano jurídico.
7. Fazer post-mortem, ações, responsável e prazo.

Contatos, severidades, canal seguro, obrigação de notificação LGPD e autoridade decisória continuam bloqueantes humanos. Não houve simulação nem pentest neste PR.

## Preparação PR 40
A execução externa futura deve seguir [ativação de staging](EXTERNAL_STAGING_ACTIVATION.md), [política sintética](PILOT_DATA_POLICY.md) e [critérios de início/pausa](PILOT_START_STOP_CRITERIA.md). Neste PR, infraestrutura, secrets, deploy, migration/seed/smoke/restore remotos, treinamento, aceite humano, piloto e produção permanecem **não executados**.
