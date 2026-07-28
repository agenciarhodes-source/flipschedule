# Fase 1.1 — Fundação técnica Next.js

## Objetivo

Estabelecer a aplicação raiz do FlipSchedule com App Router, TypeScript estrito, Tailwind CSS, shadcn/ui, testes automatizados e CI, sem portar módulos funcionais ou conectar serviços externos.

## Estrutura criada

- `app/`: layout raiz, página técnica provisória e estados de loading, não encontrado e erro.
- `components/`: status da fundação e a primitive `Button` do shadcn/ui.
- `lib/`: utilitário de composição de classes.
- `tests/`: teste isolado do componente `FoundationStatus`.
- `public/`: diretório de ativos da nova aplicação, ainda sem ativos de produto.
- `.github/workflows/next-foundation.yml`: quality gates da aplicação raiz.

Não foram criados `domains/`, `prisma/`, Route Handlers, áreas administrativas, middleware ou proxy.

## Versões declaradas

| Ferramenta | Versão |
|---|---:|
| Node.js (ambiente local) | 24.15.0 |
| pnpm | 10.28.1 |
| Next.js | 16.1.6 |
| React / React DOM | 19.2.3 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.1.18 |
| ESLint | 9.39.2 |
| Vitest | 4.0.18 |

O package manager está fixado como `pnpm@10.28.1` no `package.json`. O repositório não é um workspace pnpm; portanto, a instalação na raiz é limitada à nova aplicação e não administra `frontend/` ou `backend/`.

Neste ambiente, Node.js, Corepack, pnpm e Git foram efetivamente verificados. O proxy recusou o acesso ao registro npm com HTTP 403, portanto as dependências declaradas não puderam ser baixadas nem validadas localmente. O lockfile precisa ser regenerado e congelado em um ambiente com acesso ao registro antes do merge; os quality gates de dependências permanecem pendentes e não são declarados como aprovados.

## Scripts

- `pnpm dev`: servidor de desenvolvimento.
- `pnpm build`: build de produção.
- `pnpm start`: servidor de produção.
- `pnpm lint`: ESLint com configuração flat compatível com Next.js.
- `pnpm typecheck`: TypeScript sem emissão.
- `pnpm test` e `pnpm test:run`: Vitest interativo e execução única.
- `pnpm check`: lint, typecheck e testes em sequência.

## Testes e workflow

Vitest usa jsdom, React Testing Library e jest-dom. O teste de `FoundationStatus` verifica o nome oficial, o aviso de fundação ativa e a preservação do protótipo Emergent, sem rede, banco, horário ou serviços externos.

O workflow é disparado em Pull Requests e pushes para `main`, possui apenas permissão de leitura e executa instalação congelada, lint, typecheck, testes e build exclusivamente na raiz. Não realiza deploy, migration, seed ou qualquer comando do legado.

## Decisões provisórias

- Server Components permanecem o padrão; somente `app/error.tsx` é client-side.
- Os tokens fundamentais existentes sustentam a página técnica provisória.
- A primitive `Button`, baseada em Radix Slot, valida a inicialização mínima do shadcn/ui; seu tema não constitui o design definitivo.
- A tipografia é deliberadamente provisória até a Fase 1.2.

## Limites e segurança

Esta fase não implementa banco, Prisma, schema, migration, seed, autenticação, autorização, multi-tenancy, API, Server Action, integração, analytics, monitoramento, configuração externa ou deploy. Nenhum secret, dado de paciente ou código do seed foi incluído; não há variável necessária para página ou testes, conteúdo HTML não confiável ou `dangerouslySetInnerHTML`.

## Preservação do legado

`frontend/`, `backend/` e `memory/` permanecem como referências intactas. Nenhum código ou dependência do legado foi migrado ou atualizado.

## Próxima etapa

Fase 1.2 — design system e identidade visual. A Fase 1 permanece em andamento e não é concluída por este documento.
