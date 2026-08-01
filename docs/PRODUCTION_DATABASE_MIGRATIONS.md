# Production database migrations

## Política

- Development usa `prisma migrate dev` para iterar localmente.
- Production usa exclusivamente GitHub Actions para executar `prisma migrate deploy`.
- O secret esperado é `NEON_PRODUCTION_DIRECT_URL` no ambiente GitHub `production`.
- A conexão deve ser direta, sem hostname contendo `-pooler`.
- Nunca colar URLs no terminal, chat, PR ou logs; mantenha os secrets apenas no gerenciador de ambientes do GitHub.
- Rollback não é automático; migrations devem ser aditivas, revisadas e aprovadas antes do merge.
- `migrate deploy` é idempotente e aplica somente migrations pendentes.

## Como executar

1. Acesse a aba Actions do repositório.
2. Selecione o workflow `Database migration — production`.
3. Clique em `Run workflow`.
4. Digite exatamente `DEPLOY` no campo de confirmação.
5. Execute o workflow para disparar a deploy em produção.

## Como verificar

- O workflow executa `pnpm db:migrate:production:deploy` e depois `pnpm db:migrate:production:status`.
- O status final deve indicar que o banco está atualizado e sem migrations pendentes.
- Se o workflow falhar, a migration não será marcada como aplicada e nenhuma alteração adicional será feita automaticamente.

## Rotação da credencial

- Gere uma nova URL direta no Neon e atualize o secret `NEON_PRODUCTION_DIRECT_URL` no ambiente `production` do GitHub.
- Revogue a credencial antiga depois de confirmar o funcionamento com a nova.

## Segurança

- O workflow não imprime a connection string, não a salva em arquivo, não a adiciona ao `.env` e não a usa em pull requests ou execução automática.
- Não use pooled connection strings nem URLs de desenvolvimento em produção.
