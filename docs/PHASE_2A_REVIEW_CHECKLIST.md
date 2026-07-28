# Checklist de revisão — Passo 2A

- [ ] Todos os 30 modelos e enums correspondem aos requisitos aprovados.
- [ ] Toda entidade operacional possui `tenantId`; relações Prisma usam IDs específicos sem relation scalars sobrepostos.
- [ ] `ProfessionalClinic` protege atuação na clínica em horários e agendamentos.
- [ ] Money usa centavos; CPF, token e conteúdo sensível não estão em texto puro.
- [ ] `AccessEntitlement` não foi confundido com cobrança ou suporte temporário.
- [ ] URLs pooled/runtime, direct/CLI, shadow e test estão corretamente separadas.
- [ ] Client é lazy, server-only e reutilizado no desenvolvimento.
- [ ] Generate/validate funcionam sem banco; não existe migration ou seed.
- [ ] Checks e exclusion constraints deferidos estão completos para 2C.
- [ ] Política de deleção, anonimização, retenção e busca será decidida antes da migration.

## Correção de validação e pendências 2C

- [ ] Os 81 erros iniciais de validação (relações sobrepostas, ambíguas/opostos e opcionalidade composta) foram eliminados.
- [ ] Relações múltiplas têm nomes explícitos iguais nos dois lados.
- [ ] `TenantContext` será derivado no servidor; repositórios filtrarão por tenant e slug não será autorização.
- [ ] A migration SQL da etapa 2C lista e adiciona foreign keys compostas extras de igualdade de tenant.
- [ ] Testes de integração da etapa 2C cobrem tentativas cross-tenant negativas.
- [ ] Esta correção não criou banco ou migration, não executou migration/`db push` e não configurou Neon/Vercel.
