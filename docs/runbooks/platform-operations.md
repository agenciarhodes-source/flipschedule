# Operações e auditoria da plataforma

## Objetivo

Orientar a investigação e o reprocessamento controlado de mensagens de saída e webhooks pelo painel administrativo do FlipSchedule.

## Princípios de segurança

- O painel não carrega corpo de mensagem, payload de webhook, credenciais, tokens, contatos ou identificadores externos do provider.
- A requisição administrativa nunca chama WhatsApp, Instagram, Messenger, Facebook, Asaas ou e-mail.
- O reprocessamento apenas recoloca um registro elegível na fila do banco de dados.
- Somente registros em `FAILED` podem ser recolocados na fila.
- Mensagens precisam ser `OUTBOUND`; mensagens recebidas não são elegíveis.
- Registros concluídos, enviados, entregues, lidos ou processados nunca são reabertos.
- A operação exige a permissão `platform.operations.retry`, motivo operacional e confirmação literal `REPROCESSAR`.
- O motivo livre não é persistido. A auditoria grava apenas o código `OPERATOR_CONFIRMED`, o estado anterior, o número anterior de tentativas e um código de falha sanitizado.

## Investigação

1. Acesse `/admin/operations`.
2. Filtre por fila, status e provider.
3. Use a busca por clínica, correlação protegida ou código de falha.
4. Confirme se o registro está em `FAILED` e revise o código de falha.
5. Verifique a integração e a configuração operacional antes de reprocessar falhas permanentes.
6. Consulte `/admin/audit` para localizar alterações administrativas relacionadas.

## Reprocessamento

1. Registre no campo de motivo a validação realizada.
2. Digite `REPROCESSAR` no campo de confirmação.
3. Acione **Recolocar na fila**.
4. O registro volta para `PENDING` quando é uma mensagem ou `RECEIVED` quando é um webhook.
5. O contador de tentativas inicia um novo ciclo, enquanto os valores anteriores permanecem no evento de auditoria.
6. O worker assíncrono fará a próxima coleta conforme sua execução normal.

## Critérios para não reprocessar

Não reprocessar quando:

- a integração continua desconectada ou sem credencial;
- o destinatário, consentimento, canal ou payload continua inválido;
- a operação já foi concluída por outro processo;
- não existe evidência de que a causa original foi corrigida;
- há suspeita de duplicidade ou efeito externo já confirmado.

## Verificação posterior

- Atualize `/admin/operations` e confirme a mudança de estado.
- Consulte `/admin/audit` e confirme o evento `platform.operation.message_requeued` ou `platform.operation.webhook_requeued`.
- Acompanhe o registro até um estado terminal.
- Em nova falha, investigue o novo código antes de qualquer outra tentativa.

## Rollback do código

O recurso não cria migration. Para rollback, reverta o PR correspondente. Registros já recolocados na fila continuam seguindo o runtime assíncrono normal; não altere estados manualmente no banco.
