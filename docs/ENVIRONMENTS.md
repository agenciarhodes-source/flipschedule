# Estratégia de ambientes

## Matriz

| Ambiente | Uso | Banco | Dados | Deploy/migrations |
|---|---|---|---|---|
| Local | Desenvolvimento individual e testes | Instância/banco local ou branch Neon exclusiva, nunca compartilhada com produção | Somente fixtures fictícias | Execução manual; migrations locais revisadas |
| Preview | Revisão de PR | Banco/branch efêmera isolada por preview ou pool controlado sem produção | Seed sintético | Deploy automático pode ocorrer; migration efêmera separada e descartável |
| Staging | Validação integrada e ensaio operacional | Projeto/banco dedicado | Sintético representativo; dados reais somente se anonimizados e formalmente autorizados | Promoção controlada; migrations ensaiadas antes de produção |
| Production | Operação real | Projeto/banco dedicado com backup | Dados reais autorizados | Deploy e migration são etapas separadas, autorizadas e observáveis |

## Variáveis e secrets

`.env.example` lista somente nomes. Valores locais ficam em arquivo ignorado; valores públicos ficam na configuração do ambiente quando não sensíveis; secrets ficam no gerenciador Vercel/provedor, com escopo por ambiente. Nunca copiar secret de produção para preview/staging. `NEXT_PUBLIC_*` é público por definição.

As configurações públicas de navegação são `NEXT_PUBLIC_MARKETING_URL`, `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_SUPPORT_EMAIL`. `MARKETING_HOSTNAME` e `APP_HOSTNAME` reservam os hosts oficiais para configuração futura. Esses valores não são secrets e não podem ser usados como prova de origem, autorização, seleção de tenant ou substituto de sessão. DNS e Vercel não foram configurados por esta fundação.

## Deploy

PR pode gerar preview depois que a fundação existir. Merge e deploy seguem gates de CI e aprovação. Staging valida integração; produção requer checklist, responsável, janela/impacto e smoke test. Feature flags separam publicação de ativação. Rollback de aplicação não deve pressupor rollback automático do banco.

## Migrations

Migration é artefato versionado do Prisma e passa por revisão, teste em clone/dados sintéticos, avaliação de lock/downtime e plano de forward-fix/rollback. A execução usa conexão apropriada e credencial de menor privilégio possível. Nunca executar automaticamente em todos os previews contra banco compartilhado; nunca inferir que deploy aplicou migration.

## Seeds e dados

Seeds são idempotentes, explícitos e recusam produção por padrão. Devem usar nomes, telefones, CPFs e mensagens claramente fictícios e válidos apenas quando o teste exigir. **É proibido usar, copiar ou restaurar dados reais de pacientes em local, preview ou testes.** Staging também usa sintéticos por padrão; anonimização exige processo aprovado e irreversível.

## Integrações

Cada ambiente usa contas, apps, números, endpoints e webhooks separados quando o provedor permitir. Sandboxes são preferidos. Produção nunca recebe callback de preview. Monitoramento identifica o ambiente sem incluir PII.

## Pendências

Política de branches Neon, retenção de previews, provedores de autenticação/e-mail/storage/jobs/monitoramento, RPO/RTO e fluxo exato de promoção serão decididos antes da implementação correspondente.
