# CRM e gestão real de pacientes

## Escopo do PR 28

As rotas autenticadas de CRM e Pacientes passaram a usar os contratos de aplicação e adaptadores Prisma tenant-scoped. Leituras derivam o tenant do `ApplicationContext`, limitam e ordenam resultados e projetam somente view models serializáveis. Escritas validam os payloads com Zod, aplicam a política intermediária de autorização, verificam todas as relações no tenant e gravam auditoria sem PII.

A conversão de lead cria paciente, atribuição de origem, vínculo com o lead, transição para a etapa `WON`, histórico e auditoria na mesma transação serializável. Possíveis duplicidades por telefone E.164 ou e-mail normalizado bloqueiam criação/conversão para revisão humana. IDs de outro tenant são tratados como não encontrados.

O perfil do paciente agrega agendamentos, contagens de orçamentos e conversas e uma timeline sanitizada. Um novo agendamento pode ser criado a partir do perfil reutilizando o serviço real de Agenda. `/demo` permanece ligado exclusivamente às fixtures e componentes demonstrativos.

## Limitações do schema atual

- `LeadStageHistory` é o único registro de atividade comercial: mudanças de etapa podem guardar um motivo, mas chamadas, tarefas, lembretes e notas independentes não podem ser persistidos.
- Não existem endereço, status próprio de paciente ou relação direta paciente–unidade/profissional. Esses filtros e campos aparecem como “Ainda não disponível” em vez de serem simulados.
- CPF e notas possuem somente campos cifrados. Como esta fase não configura criptografia ou secrets, a aplicação real não coleta nem apresenta esses valores.
- Não há campo de motivo de perda separado; o motivo é registrado no histórico da transição para uma etapa `LOST`.
- Um lead convertido não pode ser reaberto, para evitar inconsistência com o paciente já criado.

Nenhum schema ou migration foi alterado ou executado. Não houve configuração de banco externo, Vercel, integrações, dependências ou secrets.
