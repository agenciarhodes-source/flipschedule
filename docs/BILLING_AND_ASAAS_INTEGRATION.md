# Billing SaaS e integração Asaas

## Limite do domínio

`Subscription`, `Payment` e `BillingCheckout` representam exclusivamente valores cobrados pelo FlipSchedule da organização contratante. Não representam pagamentos de pacientes, caixa da clínica, procedimentos ou orçamentos. Nenhum dado de `Patient`, `Lead`, `Appointment` ou `TreatmentPlan` é usado como pagador.

## Catálogo e checkout

O catálogo é tipado, injetável e vazio por padrão porque nome, preço, limites, ciclo, meios de pagamento, trial e grace period comerciais não foram aprovados. Valores são centavos inteiros. A UI informa **Planos comerciais ainda não configurados** e não permite contratar. Quando configurado, o servidor deriva preço, item, ciclo e callbacks; o navegador fornece somente um `planCode` catalogado. O Asaas recebe `POST /checkouts` para checkout recorrente hospedado. O FlipSchedule nunca recebe cartão, CVV, validade, titular ou token. A URL retornada exige HTTPS e host Asaas. Callback é UX, nunca autoridade.

## Credenciais e ambientes

A API key é resolvida por alias no `CredentialStore`, enviada somente no header `access_token` e nunca persistida, auditada, logada ou enviada ao cliente. O token `asaas-access-token` do webhook é um secret independente comparado em tempo constante. Somente `https://api-sandbox.asaas.com/v3` está habilitado; construir cliente production falha de forma fechada.

## Idempotência, tenancy e entitlements

O ID Asaas é `externalEventId`; `provider + externalEventId`, hashes e IDs externos únicos impedem duplicação. Um hash diferente para o mesmo ID vira incidente. O evento é cifrado e persistido antes de efeitos assíncronos. Correlação usa referência opaca sem PII, mas tenant sempre é resolvido por registro local e sessão/membership. Checkout criado ou callback jamais ativa acesso. Apenas pagamento confirmado/recebido após sincronização pode ativar `PAID`; `COURTESY` e `INTERNAL` são protegidos. Sem grace period aprovado, atraso marca `PAST_DUE`, mostra alerta e não suspende automaticamente.

## Cancelamento e reconciliação

Cancelamento ao fim do período exige OWNER, confirmação reforçada, RBAC server-side e auditoria sanitizada; o histórico não é apagado. A reconciliação consulta assinatura e cobranças individualmente, em lote pontual limitado. POST não recebe retry cego. Logs aceitam somente IDs opacos, status, provider, correlação, duração e código sanitizado.

## Limitações e rollback

Não há production, preços comerciais, cobrança clínica, nota fiscal, split, subconta, antecipação ou Pix Automático. A migration é aditiva e não foi aplicada. Antes de deploy: backup, impacto de lock, ordem e forward-fix. Em incidente, desabilitar worker/checkout, preservar eventos e reconciliar; enum e histórico não devem ser removidos destrutivamente.

## Hardening do PR 34

A leitura exige `subscription.read`. Ingress e worker compartilham registry Asaas configurado em runtime. Eventos suportados atualizam checkout, assinatura, pagamento e entitlement em transação; desconhecidos exigem revisão. Reconciliação preserva estado diante de status desconhecido e isola falhas por item.

## Correções tenant-safe do PR 35

`SUBSCRIPTION_CREATED` pode materializar Subscription idempotentemente a partir do BillingCheckout local do mesmo tenant; plano/ciclo vêm do checkout, nunca do payload. Payment e IDs de assinatura/checkout adotam unicidade tenant+provider; conflitos não são reconciliados silenciosamente. O SQL aborta diante de duplicidades. Migration não aplicada e Asaas production continua desativado.
