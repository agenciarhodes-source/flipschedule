# Arquitetura de domínios e rotas públicas

## Domínios oficiais

O aplicativo SaaS deste repositório tem como URL canônica `https://app.flipschedule.com.br`. A landing comercial será um projeto independente em `https://flipschedule.com.br`; este repositório não implementa nem publica essa landing.

As URLs públicas são centralizadas em `lib/config/public-urls.ts` e configuradas por `NEXT_PUBLIC_MARKETING_URL`, `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_SUPPORT_EMAIL`. `MARKETING_HOSTNAME` e `APP_HOSTNAME` documentam os hosts esperados para configuração futura. URLs e hostnames servem somente a navegação, apresentação e configuração operacional: **nunca identificam tenant, autorizam usuário ou substituem sessão e Membership ativa**.

## Contrato de navegação

| Área | Rotas | Estado atual |
|---|---|---|
| Entrada | `/` | Redirect server-side para `/login` |
| Acesso | `/login`, `/first-access`, `/forgot-password`, `/reset-password` | UI preparatória, sem autenticação, sessão, senha, token ou e-mail real |
| Demonstração | `/demo` | Experiência visual anteriormente exibida na raiz, com dados fictícios |
| Contratação | `/checkout/[plano]` e estados `success`, `pending`, `cancelled`, `error` | UI preparatória, sem preço confiável, Asaas, cobrança, assinatura ou entitlement |
| Billing | `/billing/blocked` | UI preparatória; não afirma bloqueio ou débito real |
| Aplicativo | `/dashboard`, `/agenda`, `/crm`, `/pacientes`, `/orcamentos`, `/inbox`, `/relatorios`, `/configuracoes`, `/admin` | Contrato futuro; não liberado por esta fundação |

Os retornos de checkout nunca são fonte de verdade para pagamento ou acesso. Na fase de billing, webhooks verificados e idempotentes confirmarão o estado no servidor, e entitlement continuará separado da assinatura.

## Limites desta entrega

Não foram criados autenticação, cookies, sessões, credenciais, envio de e-mail, integração Asaas, conexão Prisma/Neon, migration, DNS, projeto Vercel ou landing comercial. As páginas públicas são Server Components estáticos e não acessam persistência.

## Critérios de aceite

- A raiz redireciona no servidor para o login e a demonstração permanece acessível em `/demo`.
- O login apresenta identidade FlipSchedule, campos de e-mail/senha e links de recuperação, demo e landing, sem concluir autenticação.
- Todos os estados preparatórios declaram que nenhuma operação sensível foi realizada.
- As URLs oficiais possuem defaults testados e as rotas públicas não importam Prisma.
- Os testes funcionam sem `DATABASE_URL`.
