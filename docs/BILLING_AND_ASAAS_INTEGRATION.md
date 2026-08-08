# Billing SaaS e integração Asaas

## Limite do domínio

`Subscription`, `Payment` e `BillingCheckout` representam exclusivamente valores cobrados pelo FlipSchedule da organização contratante. Não representam pagamentos de pacientes, caixa da clínica, procedimentos ou orçamentos. Nenhum dado de `Patient`, `Lead`, `Appointment` ou `TreatmentPlan` é usado como pagador.

## Catálogo e checkout

O catálogo comercial persistido é a fonte canônica para preço, ciclo, limites e política de checkout. O navegador fornece somente um `planCode` catalogado; preço, item, ciclo, expiração e callbacks são derivados no servidor. O Asaas recebe `POST /checkouts` para checkout recorrente hospedado. O FlipSchedule nunca recebe cartão, CVV, validade, titular ou token. A URL retornada exige HTTPS e host Asaas. Callback é UX, nunca autoridade financeira.

O Checkout hospedado Asaas deste fluxo aceita apenas planos compatíveis com `PIX` e `CREDIT_CARD`. Plano que inclua meio não suportado é filtrado pela fonte específica do provider e rejeitado novamente no adapter. `minutesToExpire` é obrigatório e vem de `ASAAS_CHECKOUT_EXPIRATION_MINUTES`, entre 10 e 1440 minutos.

## Credenciais e ambientes

Sandbox e Produção usam endpoints fixos definidos em código:

- Sandbox: `https://api-sandbox.asaas.com/v3`;
- Produção: `https://api.asaas.com/v3`.

A aplicação não aceita URL base do Asaas por input/env. A API key é enviada somente no header `access_token`. O token `asaas-access-token` do webhook é um secret independente. Produção exige o token canônico `ASAAS_WEBHOOK_TOKEN`; o alias `ASAAS_WEBHOOK_SECRET` permanece apenas para compatibilidade de ambientes protegidos antigos.

## Efeitos externos e gates de Produção

`EXTERNAL_EFFECTS_MODE` suporta `DISABLED`, `SANDBOX` e `PRODUCTION`, mas `PRODUCTION` é válido somente quando `APP_ENV=production`. Além disso, efeitos reais exigem escopo explícito em `EXTERNAL_EFFECTS_PRODUCTION_SCOPES`; billing Asaas usa exclusivamente `ASAAS_BILLING`.

O billing real continua desligado por padrão. Para readiness de Produção são necessários simultaneamente:

- `ASAAS_ENVIRONMENT=production`;
- `EXTERNAL_EFFECTS_MODE=PRODUCTION`;
- escopo `ASAAS_BILLING`;
- `ASAAS_PRODUCTION_BILLING_ENABLED=true`;
- confirmação exata `ENABLE_REAL_ASAAS_CHARGES`;
- API key e token canônico de webhook protegidos;
- origem HTTPS igual a `PRODUCTION_HOSTNAME`;
- expiração válida;
- allowlist explícita em `ASAAS_PRODUCTION_TENANT_SLUGS`.

Wildcard de tenant é rejeitado no rollout inicial. O mesmo allowlist é aplicado na UI e novamente no serviço antes de qualquer efeito externo. O comando `pnpm ops:asaas-production-preflight` valida readiness sem rede e sem imprimir segredos. O procedimento operacional completo está em `docs/ASAAS_PRODUCTION_BILLING_RUNBOOK.md`.

## Idempotência, tenancy e entitlements

O ID Asaas é `externalEventId`; unicidade, hashes e IDs externos impedem duplicação. Um hash diferente para o mesmo ID vira incidente. O evento é cifrado e persistido antes de efeitos assíncronos. Billing compartilhado resolve tenant por referências/IDs locais de checkout, assinatura e pagamento antes do fallback de integração, falhando fechado diante de ambiguidade.

Checkout criado ou callback jamais ativa acesso. Apenas pagamento confirmado/recebido após sincronização pode ativar `PAID`; `COURTESY` e `INTERNAL` são protegidos. `Subscription.commercialPlanId` é materializado a partir do plano comercial local, preservando quotas e limites após a sincronização do provider.

## Concorrência, cancelamento e reconciliação

Criação de checkout usa advisory lock por tenant e estados `CREATED`, `ACTIVE` e `PAID` bloqueiam uma segunda criação. Checkout ativo do mesmo plano pode ser retomado; outro plano, pagamento aguardando sync ou estado ambíguo falham fechados. Se webhook vencer a resposta HTTP da criação, o `externalCheckoutId` recebido pelo webhook é preservado.

Cancelamento ao fim do período exige OWNER, confirmação reforçada, RBAC server-side e auditoria sanitizada. A reconciliação consulta assinatura e cobranças individualmente, em lote pontual limitado. POST financeiro não recebe retry cego. Logs aceitam somente IDs opacos, status, provider, correlação, duração e código sanitizado.

## Rollback

O kill switch primário para novas criações reais é `ASAAS_PRODUCTION_BILLING_ENABLED=false`. Para bloquear efeitos externos de Produção no runtime como um todo, use `EXTERNAL_EFFECTS_MODE=DISABLED`. Rollback não apaga histórico e não cancela automaticamente objetos já criados no Asaas; eventos, checkouts, assinaturas e pagamentos existentes devem ser preservados e reconciliados.
