# Codex Workflow

Este documento descreve o fluxo oficial para usar o ambiente de desenvolvimento local e o Codex Cloud no repositório FlipSchedule.

## Diferença entre Codespaces e Codex Cloud

- Codespaces é um ambiente de desenvolvimento completo com acesso ao repositório Git, terminal e editor.
- Codex Cloud é um ambiente de assistência onde o código pode ser apresentado como um snapshot em uma branch local `work` sem remotes.

## Branch `work` como checkout válido no Codex Cloud

- O Codex Cloud pode disponibilizar o commit selecionado em uma branch local chamada `work`.
- Essa branch é válida se representar o snapshot autorizado pelo usuário.
- A ausência de uma branch local `main` não deve interromper a tarefa.

## Ausência de remote como condição válida

- A ausência de `origin` ou de qualquer remote não é motivo para interromper uma tarefa.
- Quando o ambiente não possuir remote, o `HEAD` atual deve ser tratado como o snapshot autorizado da branch escolhida pelo usuário.

## Criação de PR pela interface do Codex

- Não executar `git switch main`, `git pull`, `git fetch`, `git push` ou `gh pr create` quando não houver remote.
- A criação do Pull Request deve ser realizada pelo fluxo da interface do Codex quando não houver remote.

## Quando usar Codespaces

- Use Codespaces quando precisar de um ambiente estável com remotes configurados, acesso ao branch `main` e histórico Git completo.
- Use Codespaces para edição interativa, depuração local e integração com serviços remotos disponíveis.

## Quando usar Codex Cloud

- Use Codex Cloud para tarefas orientadas por assistente onde o ambiente pode ser fornecido como um checkout temporário `work`.
- Aceite que o ambiente pode não ter `origin` e que o `HEAD` atual é o ponto de verdade.

## Setup script oficial

O script oficial é `scripts/codex-setup.sh`.

Ele realiza:

- `corepack enable`
- `corepack prepare pnpm@10.28.1 --activate`
- `pnpm install --frozen-lockfile`
- `pnpm db:generate`

O script não:

- cria `.env`
- executa migrations
- acessa banco
- cria seed
- imprime secrets

## Quality gates

O fluxo recomendado inclui:

- `pnpm install --frozen-lockfile`
- `pnpm db:format`
- `pnpm db:validate`
- `pnpm db:generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm check`

## Dependências e lockfile

- As dependências são fixadas em `pnpm-lock.yaml`.
- Use sempre `pnpm install --frozen-lockfile` para garantir reprodutibilidade.
- Falhar com lockfile desatualizado é esperado e necessário.

## Proibição de depender de downloads no build

- O build não deve depender de downloads externos como Google Fonts.
- Fontes usadas na aplicação devem ser carregadas localmente via `@fontsource`.

## Como iniciar uma nova tarefa a partir de main

1. Certifique-se de que `main` está atualizado no repositório remoto, quando disponível.
2. Crie uma nova branch a partir de `main` para a tarefa.
3. Não reutilize uma branch antiga se houver novos merges em `main`.

> Uma nova tarefa deve ser criada quando for necessário receber uma `main` mais recente.
