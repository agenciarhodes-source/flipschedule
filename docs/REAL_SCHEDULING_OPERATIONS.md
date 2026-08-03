# Operações reais de configuração e agenda

## Escopo implementado no PR 27

As rotas autenticadas de Agenda e Configurações usam readers e serviços Prisma tenant-scoped. Escritas recebem exclusivamente o `ApplicationContext` derivado da sessão, validam payloads com Zod, verificam relações no tenant e registram `AuditLog`. Criação e reagendamento verificam sobreposição de profissional, recurso e bloqueios dentro de transação com isolamento serializável.

O modo `/demo` continua usando fixtures e componentes próprios, sem qualquer escrita no banco.

## Critérios de aceite

- unidade, profissional, procedimento, recurso e horários podem ser criados e editados pelos serviços;
- bloqueios e paciente mínimo podem ser criados;
- agendamentos podem ser criados, reagendados, confirmados, receber chegada, ser finalizados, marcados como falta ou cancelados;
- IDs de outro tenant falham como não encontrados e perfis sem permissão falham fechados;
- toda escrita bem-sucedida produz auditoria sem PII em metadata;
- conflitos de profissional, recurso e bloqueio impedem a reserva;
- histórico de status é persistido e consultável em ordem determinística.

## Limitações impostas pelo schema existente

O enum `AppointmentStatus` não possui um estado equivalente a `IN_SERVICE`. Portanto, este PR não inventa coluna, enum ou migration: `ARRIVED` registra a chegada e `ATTENDED` registra a finalização, mas o instante separado de início do atendimento não pode ser persistido. A interface não alega que essa transição exista. Uma futura alteração de schema, em PR próprio, é necessária para cumprir esse requisito literalmente.

O schema também não possui campo de versão para optimistic locking. Por isso `STALE_DATA` faz parte do contrato comum, mas edição por versão não pode ser implementada sem migration. A prevenção de dupla reserva usa transação serializável; produção ainda deve tratar retry de erro de serialização conforme a política operacional aprovada.

Notas clínicas não são coletadas pelos formulários rápidos. O schema oferece apenas campos cifrados, e este PR não introduz criptografia ou secret sem decisão específica.

## Operação

Nenhuma migration é necessária ou foi executada. O deploy não aplica alterações de banco. A validação de integração contra PostgreSQL exige um banco local/preview sintético e isolado; nunca deve apontar para production.
