# Catálogo de integrações previstas

Nenhuma integração está configurada nesta fase. Todos os adapters são server-only; secrets ficam por ambiente; webhooks são verificados, persistidos e idempotentes; o tenant é resolvido por mapeamento confiável da integração, nunca por campo arbitrário do payload.

| Integração | Objetivo | Dados armazenados | Webhooks | Secrets | Idempotência e tenant | Fase |
|---|---|---|---|---|---|---|
| Asaas | Assinaturas e cobranças recorrentes | IDs externos, customer/subscription/payment, status, centavos e timestamps; mínimo de snapshot necessário | Eventos de cobrança/assinatura verificados e reconciliados | API key e webhook secret separados por ambiente | ID externo único; `WebhookEvent`; `Integration`/Subscription vinculadas ao tenant | 5 |
| WhatsApp Cloud API | Envio/recebimento oficial na inbox | WABA/phone IDs, message IDs/status, contato normalizado, conteúdo conforme retenção aprovada | Verificação Meta, assinatura, mensagens/status | App secret, verify token, system token e IDs | Message/event ID único; integração identifica tenant antes de processar | 7 |
| E-mail | Auth e mensagens transacionais | Provider message ID, template/event/status e destinatário minimizado | Delivery, bounce e complaint assinados | API key e webhook secret | Provider event/message ID; origem/config tenant quando aplicável | 3 para auth; 7 para comunicação |
| Instagram | Unificar mensagens/autorizadas | Account/page IDs, threads, message IDs/status e conteúdo mínimo | Eventos Meta verificados | Credenciais Meta protegidas/rotacionáveis | IDs Meta únicos; account mapeada a uma Integration tenant | 8 |
| Messenger | Unificar conversas de páginas | Page/thread/message IDs/status e conteúdo mínimo | Eventos Meta verificados | Credenciais Meta | Evento/mensagem únicos; Page vinculada ao tenant | 8 |
| Facebook Lead Ads | Ingerir leads e atribuição | Form/lead/ad/campaign IDs, campos permitidos, timestamps e consentimento/origem | Leadgen verificado | Credenciais Meta | Lead ID único; Page/Form allowlisted para tenant | 8 |
| Storage | Arquivos privados necessários a fluxos aprovados | Object key opaca, tenant, tipo, tamanho, hash e retenção; não URL pública permanente | Evento somente se necessário e verificado | Credenciais de storage server-only | Chave única e prefixo/policy tenant; operações repetíveis | 4 ou 7, quando necessário |
| Monitoramento | Erros, métricas, traces e alertas | Telemetria sem PII/saúde/secrets | Alertas/callbacks apenas se adotados | DSN/token por ambiente | Fingerprints/event IDs; ambiente/tenant apenas por ID opaco | 1 e amadurece até 9 |

## Regras comuns

- Definir finalidade, minimização, retenção, suboperador e base legal antes de dados reais.
- Não armazenar access token em claro sem proteção adequada; registrar rotação/revogação.
- Assinatura inválida, timestamp fora da janela, evento duplicado ou integração desativada não produz efeito.
- Falhas entram em retry limitado e reconciliação; dead letters não expõem payload sensível.
- Logs guardam IDs opacos, não corpo completo. Métricas não carregam cardinalidade/PII desnecessária.
- Mudanças de versão de API/provider são acompanhadas e testadas antes de promoção.

## Pendências

Escolher provedores de e-mail, storage, jobs/realtime e monitoramento; aprovar contas/apps oficiais; definir retenção de conteúdo de mensagens e anexos; detalhar modelo comercial Asaas e regras de atribuição Meta.
