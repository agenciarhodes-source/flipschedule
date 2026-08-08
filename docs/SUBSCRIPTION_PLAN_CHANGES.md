# Troca self-service de plano da assinatura

Este fluxo permite que o **OWNER** altere o plano comercial de uma assinatura Asaas existente sem criar uma segunda assinatura.

## Escopo

A troca vale somente para billing SaaS do FlipSchedule. Não altera pagamentos de pacientes, caixa da clínica, split, subcontas ou qualquer cobrança fora da assinatura do produto.

## Regras de autorização

- somente `OWNER` com `subscription.manage` pode solicitar a troca;
- a confirmação deve ser exatamente `ALTERAR PLANO`;
- a assinatura precisa ser Asaas e estar `ACTIVE`;
- assinatura com cancelamento agendado não pode trocar de plano;
- em Produção, o fluxo reutiliza integralmente os gates do billing do PR #65, inclusive kill switch, escopo `ASAAS_BILLING` e allowlist por tenant.

## Capacidade e downgrade

Antes de qualquer efeito externo, o servidor valida o uso atual do tenant contra `maxClinics` e `maxUsers` do plano alvo. Downgrade que não comporte unidades ativas, memberships reservadas ou convites pendentes é rejeitado.

A intenção de troca é persistida antes da chamada ao provider. Enquanto ela estiver sem resultado terminal, as quotas efetivas usam o limite mais restritivo entre plano atual e plano alvo. Isso evita duas corridas:

- consumir novas vagas enquanto um downgrade está em voo;
- consumir capacidade maior de um upgrade antes de o Asaas confirmar a alteração.

## Mutação no Asaas

O FlipSchedule atualiza a **mesma assinatura externa**. Não cria checkout nem segunda assinatura para troca de plano.

Antes do `PUT`, o sistema lê a assinatura autoritativa no Asaas e verifica se valor/ciclo ainda correspondem ao plano atual. A forma de cobrança é lida do provider e precisa ser compatível com o plano alvo; o campo local `billingType` não é usado como autoridade para essa decisão.

A atualização envia somente:

- `value` do plano alvo;
- `cycle` do plano alvo;
- descrição do plano;
- `updatePendingPayments: true`.

Cobranças já pagas não são reescritas. O objetivo de `updatePendingPayments` é manter cobranças ainda pendentes coerentes com a assinatura atualizada.

## Idempotência operacional e resultado incerto

A intenção usa `AuditLog` tenant-scoped e `correlationId` como trilha durável. Uma assinatura com intenção não terminal rejeita uma segunda troca.

O fluxo não executa retry financeiro cego:

- rejeição permanente do provider encerra a intenção como falha;
- timeout, rate limit ou resposta cujo estado final não possa ser comprovado marca reconciliação necessária;
- uma nova mutação fica bloqueada até o worker confirmar o estado real.

## Reconciliação

O worker consulta a assinatura Asaas e compara valor/ciclo com os snapshots da intenção:

- **TARGET**: materializa `planCode` e `commercialPlanId` do alvo e encerra a intenção como reconciliada;
- **CURRENT**: mantém o plano local atual e encerra a intenção como falha, permitindo uma nova tentativa explícita depois;
- **AMBIGUOUS/INCOMPLETE**: falha fechado e mantém a intenção pendente para investigação.

A finalização usa o mesmo advisory lock de troca e o lock de quotas comerciais, evitando corrida com alterações de unidades ou acessos.

## Webhook e billingType

Eventos de assinatura Asaas agora carregam `billingType` quando o provider o envia. O materializador persiste esse valor autoritativo e não usa mais o ciclo (`MONTHLY`/`YEARLY`) como forma de pagamento.

## Auditoria

A trilha usa as ações:

- `billing.subscription.plan_change.requested`;
- `billing.subscription.plan_change.applied`;
- `billing.subscription.plan_change.failed`;
- `billing.subscription.plan_change.reconciliation_required`;
- `billing.subscription.plan_change.reconciled`.

Metadados contêm somente códigos de plano, snapshots comerciais, correlation IDs e códigos operacionais. Nenhum secret ou dado de cartão é persistido.

## Fora de escopo

- provisioning público/anônimo;
- criar uma nova assinatura para trocar de plano;
- alterar manualmente a forma de cobrança durante a troca;
- retry automático de mutação financeira incerta;
- alteração de cobrança já paga;
- configuração de secrets ou ativação do Asaas em Produção;
- migration de banco ou nova dependência.
