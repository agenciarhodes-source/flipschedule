# Máquina de estados de billing

## Checkout

`CREATED → ACTIVE → PAID`; falhas podem produzir `FAILED`, e o provedor pode finalizar em `CANCELLED` ou `EXPIRED`. `CHECKOUT_CREATED` não concede acesso. `CHECKOUT_PAID` apenas agenda confirmação financeira.

## Assinatura

Estados operacionais são `PENDING`, `ACTIVE`, `PAST_DUE` e `SUSPENDED`; um índice parcial impede mais de um por tenant. `CANCELLED` e `EXPIRED` preservam histórico. `cancelAtPeriodEnd` mantém acesso até `currentPeriodEnd`. Sem política comercial aprovada, atraso não calcula carência nem suspende automaticamente.

## Cobrança e acesso

Eventos `CREATED/UPDATED`, `CONFIRMED`, `RECEIVED`, `OVERDUE`, `REFUNDED`, captura recusada e cancelamento mapeiam explicitamente a `PENDING`, `CONFIRMED`, `RECEIVED`, `OVERDUE`, `REFUNDED`, `FAILED` e `CANCELLED`. Evento desconhecido, chargeback, reembolso parcial ou risco exige revisão e nunca é reduzido a cancelamento. `CONFIRMED/RECEIVED` pode ativar/renovar entitlement `PAID` idempotentemente. `COURTESY` e `INTERNAL` prevalecem e não são revogados por billing.

## Garantias adicionais do PR 34

Status externo desconhecido não mapeia para `PENDING` e não regride estado local. Evento confirmado/recebido ativa `PAID` idempotente, preservando `COURTESY` e `INTERNAL`; efeito e marcação `PROCESSED` compartilham transação.
