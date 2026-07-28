# Estratégia de domínios

## Nome

O nome oficial é **FlipSchedule**. O domínio definitivo ainda não foi validado; nenhuma opção descrita aqui representa compra, disponibilidade ou decisão de marca.

## Topologia pretendida

| Finalidade | Placeholder | Variável |
|---|---|---|
| Marketing | `<marketing-domain>` | `NEXT_PUBLIC_MARKETING_URL` |
| Aplicação autenticada | `<app-subdomain>.<base-domain>` | `NEXT_PUBLIC_APP_URL` |
| Administração futura | `<admin-subdomain>.<base-domain>` | `NEXT_PUBLIC_ADMIN_URL` |

O subdomínio administrativo só será criado se houver produto administrativo real e threat model próprio. Não expor um “Super Admin” apenas por convenção de URL.

## DNS e certificados

Após validação jurídica/comercial e controle da zona, usar registros recomendados pela plataforma de hospedagem, TLS obrigatório, renovação gerenciada, redirecionamento canônico e proteção contra takeover de subdomínio. Mudanças DNS têm TTL, janela, rollback e verificação de ownership documentados. Ambientes não produtivos usam hosts explicitamente separados.

## Configuração

URLs canônicas, callbacks OAuth, webhooks, CORS/origins, e-mail e links públicos vêm de variáveis por ambiente. É proibido hardcodar domínio em código, template, migration ou integração. Construção de URL deve usar origem validada e allowlist; não confiar cegamente em `Host`/headers encaminhados.

## Pendências

- Validar disponibilidade, marca, titularidade e domínio base.
- Decidir necessidade e nome do subdomínio administrativo.
- Definir estratégia de domínios customizados de tenants; não faz parte do MVP atual.
- Aprovar redirects, canonical URLs, e-mail e callbacks antes da Fase 6.
