# Checklist de revisão — Passo 2A

- [ ] Todos os 30 modelos e enums correspondem aos requisitos aprovados.
- [ ] Toda entidade operacional possui `tenantId` e toda relação crítica é tenant-safe.
- [ ] `ProfessionalClinic` protege atuação na clínica em horários e agendamentos.
- [ ] Money usa centavos; CPF, token e conteúdo sensível não estão em texto puro.
- [ ] `AccessEntitlement` não foi confundido com cobrança ou suporte temporário.
- [ ] URLs pooled/runtime, direct/CLI, shadow e test estão corretamente separadas.
- [ ] Client é lazy, server-only e reutilizado no desenvolvimento.
- [ ] Generate/validate funcionam sem banco; não existe migration ou seed.
- [ ] Checks e exclusion constraints deferidos estão completos para 2C.
- [ ] Política de deleção, anonimização, retenção e busca será decidida antes da migration.
