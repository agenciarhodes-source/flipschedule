# Onboarding comercial self-service

Este fluxo transforma uma contratação pública válida em um ambiente FlipSchedule sem criar tenant, usuário ou credencial antes da confirmação financeira do Asaas.

## 1. Intenção pré-tenant

`CommercialOnboardingIntent` é o pedido comercial interno antes do tenant existir. Ele guarda somente os dados necessários para reconciliar a contratação e provisionar o ambiente:

- plano e snapshots de preço/ciclo;
- nome/e-mail do proprietário;
- nome/slug desejados para o ambiente;
- referências opacas do Asaas;
- snapshots independentes de checkout, subscription e payment;
- status de onboarding e correlation id;
- hash do token público usado apenas para consulta de status.

O token público nunca é persistido em texto puro.

## 2. Criação do checkout

A rota pública `/checkout/[plano]` valida plano, identidade e disponibilidade antes do efeito externo.

A criação usa:

- rate limit durável por e-mail e IP;
- advisory locks separados para e-mail e slug;
- nova validação de conflito de `User` e `Tenant` dentro da transação;
- persistência da intenção antes do POST ao Asaas;
- os mesmos gates de ambiente, kill switch e allowlist de Produção do billing existente.

O checkout hospedado recebe somente nome e e-mail como `customerData`. Dados de cartão não passam pelo FlipSchedule.

Se o resultado do POST for incerto por timeout, rate limit ou falha temporária, a intenção passa para `RECONCILIATION_REQUIRED`. O sistema não cria outro checkout automaticamente.

Um checkout já conhecido em `CHECKOUT_ACTIVE` pode ser retomado pelo ID autoritativo do Asaas. O token do callback original não é rotacionado durante a retomada.

## 3. Callback não confirma pagamento

As rotas `/checkout/success`, `/checkout/cancelled`, `/checkout/error` e `/checkout/pending` consultam somente o estado já persistido pelo servidor usando um token opaco.

O retorno do navegador nunca:

- marca pagamento como recebido;
- cria subscription;
- cria tenant;
- concede entitlement;
- ativa usuário.

## 4. Webhooks pré-tenant

O webhook Asaas é aceito sem `tenantId` somente quando os identificadores financeiros resolvem de forma inequívoca para um `CommercialOnboardingIntent` conhecido.

Eventos ambíguos ou não resolvidos falham fechado. Não existe fallback de billing para uma integração arbitrária.

Subscription e payment podem chegar antes de `CHECKOUT_PAID`. Nesses casos, snapshots mínimos são preservados na intenção para posterior materialização. Estados do provider são separados por recurso para impedir sobrescrita por ordem de entrega.

## 5. Provisionamento

Somente `BillingCheckoutChanged` com status `PAID` dispara provisionamento.

Sob advisory lock do onboarding e em uma única transação, o worker:

1. revalida plano, e-mail e slug;
2. cria `Tenant`;
3. cria a clínica `principal`;
4. cria `User` do proprietário;
5. cria `Membership` OWNER ativa;
6. cria a conta de credencial com uma senha aleatória de alta entropia que nunca é exibida ou enviada;
7. materializa o `BillingCheckout` tenant-scoped;
8. materializa `Subscription` e `Payment` se os snapshots já existirem;
9. materializa entitlement PAID somente se já existir pagamento `CONFIRMED` ou `RECEIVED`;
10. marca a intenção como `PROVISIONED` e grava auditoria.

Depois do provisionamento, eventos futuros são processados pelo pipeline normal tenant-scoped de billing.

Se e-mail ou slug tiverem sido ocupados entre a criação do checkout e o pagamento, o provisionamento falha fechado com o pagamento preservado para revisão operacional. O cliente não deve pagar novamente.

## 6. Primeiro acesso

O provisionamento não envia senha temporária.

Após o commit da transação, o FlipSchedule cria um `PasswordResetToken` com propósito `ACCOUNT_ACTIVATION`:

- token aleatório com prefixo `act_`;
- somente o hash é persistido;
- validade de 24 horas;
- uso único;
- tokens anteriores de ativação são revogados.

O link `/activate-account` permite ao proprietário criar a própria senha. Ao consumir um token válido, o sistema:

- atualiza a senha;
- marca o e-mail como verificado;
- conclui o primeiro acesso;
- revoga sessões existentes;
- registra auditoria.

Falha na entrega do e-mail não desfaz pagamento nem provisionamento. O erro fica registrado e o fluxo de recuperação de senha permanece disponível.

## 7. Idempotência e corridas

As principais fronteiras são:

- checkout público: locks `350063` (e-mail) e `350064` (slug);
- provisionamento: lock `350065` por intenção;
- webhook: `provider + externalEventId` continua sendo idempotente;
- referências externas da intenção são únicas;
- `tenantId` provisionado é único por intenção;
- nenhum retry automático é executado para um POST financeiro de resultado incerto.

## Fora de escopo

- criar tenant antes do pagamento;
- cadastro anônimo sem plano/checkout válido;
- armazenar dados de cartão;
- configurar secrets ou habilitar billing de Produção;
- alterar regras de upgrade/downgrade do PR #66;
- sincronizar features do plano;
- executar cobranças reais durante testes/CI.
