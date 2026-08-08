# Runbook de Billing Asaas em Produção

Este runbook habilita **somente o billing SaaS do FlipSchedule**. Ele não se aplica a pagamentos de pacientes, caixa clínico, split, subcontas ou qualquer movimentação financeira fora da assinatura do produto.

## Princípio de segurança

O suporte a Produção existe no código, mas fica **fail-closed**. Nenhuma cobrança real pode ser iniciada enquanto todos os gates abaixo não estiverem válidos ao mesmo tempo. O último gate a ser ligado deve ser `ASAAS_PRODUCTION_BILLING_ENABLED=true`.

## Gates obrigatórios

| Gate | Valor esperado |
| --- | --- |
| `APP_ENV` | `production` |
| `EXTERNAL_EFFECTS_MODE` | `PRODUCTION` |
| `EXTERNAL_EFFECTS_PRODUCTION_SCOPES` | contém `ASAAS_BILLING` |
| `ASAAS_ENVIRONMENT` | `production` |
| `ASAAS_PRODUCTION_BILLING_ENABLED` | `true` somente no go-live |
| `ASAAS_PRODUCTION_CONFIRMATION` | `ENABLE_REAL_ASAAS_CHARGES` |
| `ASAAS_PRODUCTION_TENANT_SLUGS` | lista explícita de slugs; `*` é rejeitado |
| `ASAAS_API_KEY` | secret de Produção, nunca Sandbox |
| `ASAAS_WEBHOOK_TOKEN` | token canônico de webhook de Produção |
| `ASAAS_CHECKOUT_EXPIRATION_MINUTES` | inteiro entre 10 e 1440 |
| `NEXT_PUBLIC_APP_URL` | origem HTTPS oficial |
| `PRODUCTION_HOSTNAME` | hostname exato da origem oficial |

`ASAAS_WEBHOOK_SECRET` é apenas alias legado para ambientes protegidos antigos. Ele **não substitui** `ASAAS_WEBHOOK_TOKEN` para readiness de Produção.

## Pré-requisitos externos

1. Conta Asaas de Produção ativa e apta a operar.
2. API key de Produção criada e armazenada exclusivamente no gerenciador de secrets do ambiente.
3. Webhook de Produção configurado para `/api/webhooks/asaas`, com token de autenticação próprio e independente da API key.
4. Webhook configurado para os eventos de Checkout/Pagamento utilizados pelo FlipSchedule.
5. Domínio oficial HTTPS e deploy de Produção saudáveis.
6. Worker de webhooks/reconciliação operacional e observabilidade disponível antes do primeiro checkout real.

## Ordem segura de ativação

1. Faça deploy deste código mantendo `ASAAS_PRODUCTION_BILLING_ENABLED=false` e, se possível, `EXTERNAL_EFFECTS_MODE=DISABLED` durante a preparação inicial.
2. Configure API key, webhook token, hostname, expiração e uma allowlist pequena de tenants de piloto.
3. Configure `ASAAS_ENVIRONMENT=production`, `EXTERNAL_EFFECTS_MODE=PRODUCTION` e `EXTERNAL_EFFECTS_PRODUCTION_SCOPES=ASAAS_BILLING`, mantendo o kill switch de billing em `false`.
4. Configure `ASAAS_PRODUCTION_CONFIRMATION=ENABLE_REAL_ASAAS_CHARGES`.
5. Execute `pnpm ops:asaas-production-preflight`. Antes do go-live, o resultado esperado é `ready=false` com `ASAAS_PRODUCTION_BILLING_DISABLED` como bloqueio restante.
6. Confirme manualmente que a allowlist contém somente os tenants aprovados para o primeiro rollout.
7. Como último passo, altere `ASAAS_PRODUCTION_BILLING_ENABLED=true` e faça o deploy protegido da configuração.
8. Execute novamente `pnpm ops:asaas-production-preflight`. Só prossiga se `ready=true` e `issues=[]`.

O preflight é **secretless e sem rede**: ele não chama o Asaas, não cria checkout e não imprime API key, token de webhook ou valor de confirmação.

## Primeiro checkout real

O primeiro checkout real deve ser executado apenas por um OWNER de tenant presente na allowlist e após revisão operacional. O redirecionamento de sucesso nunca é autoridade financeira: acesso pago depende de webhook/reconciliação. Após o teste controlado, confirme:

- `BillingCheckout` possui `externalCheckoutId` e estado coerente;
- eventos de webhook foram persistidos e processados idempotentemente;
- `Subscription.commercialPlanId` foi materializado corretamente;
- pagamento confirmado/recebido foi conciliado antes de ativar entitlement `PAID`;
- não houve checkout duplicado para o tenant;
- logs contêm somente IDs opacos/correlation IDs e códigos sanitizados.

## Rollback / kill switch

Para interromper imediatamente **novas** criações de checkout real:

1. defina `ASAAS_PRODUCTION_BILLING_ENABLED=false` e redeploy;
2. para bloquear todos os efeitos externos de produção suportados pelo runtime, defina também `EXTERNAL_EFFECTS_MODE=DISABLED`;
3. não apague `BillingCheckout`, `Subscription`, `Payment` ou `WebhookEvent` existentes;
4. preserve webhooks recebidos e use reconciliação para fechar estados já iniciados;
5. remova tenants da allowlist antes de reabrir o rollout, se necessário.

Desligar o kill switch não cancela automaticamente um checkout/assinatura já criado no Asaas; itens já iniciados devem ser reconciliados e tratados explicitamente.

## Expansão do rollout

O rollout inicial não aceita wildcard. Para incluir novos clientes, acrescente os slugs aprovados a `ASAAS_PRODUCTION_TENANT_SLUGS` e redeploy. Remover um slug bloqueia novas criações/retomadas pelo fluxo do FlipSchedule, sem apagar histórico financeiro existente.
