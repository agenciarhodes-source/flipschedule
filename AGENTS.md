# Instruções permanentes para agentes — FlipSchedule

## Contexto e autoridade documental

FlipSchedule é um SaaS multi-tenant para clínicas odontológicas e clínicas médicas. O protótipo React/FastAPI/MongoDB continua no repositório somente como referência funcional e visual durante a reconstrução.

Antes de planejar ou alterar qualquer arquivo, leia `docs/README.md`, os documentos ali classificados como normativos, os ADRs aplicáveis, `docs/PRODUCT_REQUIREMENTS.md`, `docs/ROADMAP.md` e a auditoria atual. Instruções diretas do usuário prevalecem; em seguida, ADRs aceitos e documentos normativos. Se houver contradição, não escolha silenciosamente: registre-a e solicite decisão quando bloquear o escopo.

## Nome, idioma e interface

- O nome oficial e obrigatório é **FlipSchedule**.
- A interface e mensagens ao usuário são em português brasileiro; código, nomes internos, tabelas, campos, APIs e commits técnicos usam inglês.
- Preserve a identidade visual atual. Não redesenhe, troque tokens, fontes, cores, layout ou comportamento visual sem pedido explícito.
- Preserve `frontend/` como referência até existir equivalência aprovada. Não o remova ou sobrescreva durante a migração.
- Garanta responsividade, acessibilidade e estados de loading, vazio, erro e sucesso.

## Stack e estrutura alvo

Stack oficial: Next.js com App Router, React, TypeScript estrito, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Prisma ORM, PostgreSQL no Neon e deploy na Vercel. Autenticação real, sessões seguras, RBAC, Asaas e integrações oficiais Meta fazem parte da arquitetura, nas fases do roadmap.

Estrutura alvo, a ser criada somente nas fases autorizadas:

```text
app/                 # rotas e layouts do App Router
components/          # UI compartilhada e primitives shadcn/ui
domains/             # regras e serviços por domínio
lib/                 # infraestrutura e utilitários
prisma/              # schema e migrations
tests/               # testes de integração/e2e e fixtures
docs/                # requisitos, arquitetura, segurança e ADRs
```

Não crie essa estrutura antecipadamente se a tarefa for apenas documental.

## Arquitetura e domínio

- Componentes de UI não acessam o banco diretamente. Regras de negócio ficam em serviços server-side testáveis.
- Valide entradas não confiáveis com Zod no limite do sistema; TypeScript não substitui validação runtime.
- Todo valor monetário é inteiro em centavos. Nunca use ponto flutuante para persistência ou cálculo financeiro.
- Armazene instantes em UTC e apresente-os no timezone IANA do tenant. Datas civis devem ter semântica explicitamente documentada.
- Normalize telefones para E.164 e valide CPF antes da persistência. Não use CPF como identificador público.
- Integrações externas ficam atrás de adapters e webhooks idempotentes. Não acople regras de domínio diretamente a SDKs.
- Decisões arquiteturais duradouras exigem ADR novo ou atualização explícita de ADR existente.

## Segurança, autenticação, RBAC e multi-tenancy

- Negue acesso por padrão. Toda rota privada exige sessão verificada no servidor.
- Nunca confie em `tenant_id`, role, user ID, preços, status privilegiados ou ownership enviados pelo navegador.
- Resolva o tenant pela sessão autenticada e por uma `Membership` ativa. Slug serve para roteamento/apresentação, nunca como autorização.
- Toda query tenant-scoped deve receber contexto de tenant confiável no servidor e filtrar por ele. Valide que entidades relacionadas pertencem ao mesmo tenant.
- Aplique RBAC no servidor, por ação e recurso. Ocultar botão não é autorização.
- Cookies de sessão devem ser `HttpOnly`, `Secure` em ambientes públicos e usar `SameSite` apropriado. Proteja mutações contra CSRF conforme o mecanismo de sessão.
- Secrets ficam somente no gerenciador do ambiente; nunca no Git, logs, bundles client-side, fixtures ou documentação.
- Nunca registre CPF, telefone, e-mail, conteúdo clínico, tokens, cookies ou payloads de webhook em logs comuns. Use redaction e identificadores opacos.
- Trate dados de saúde e PII segundo LGPD, mínimo privilégio, minimização, retenção e rastreabilidade.

## Banco e migrations

- Prisma é a fonte versionada do modelo relacional; PostgreSQL Neon é o banco alvo.
- Toda mudança de banco requer alteração no schema Prisma e migration revisável. Nunca crie ou altere tabela manualmente sem refletir no Prisma.
- Nunca execute migration automaticamente em produção, preview ou staging. Declare ambiente, backup, impacto, ordem e rollback/forward-fix antes da execução.
- PR aberto, deploy concluído, migration aplicada e funcionalidade validada são estados independentes; reporte cada um separadamente.
- Use constraints, foreign keys, índices e transações para invariantes. IDs e relações tenant-scoped devem impedir associação entre tenants.
- Seeds devem ser explícitos, idempotentes, seguros para o ambiente e conter apenas dados fictícios. Nunca execute seed destrutivo em produção.

## Testes e critérios de aceite

- Toda tarefa futura deve declarar critérios de aceite e incluir testes proporcionais ao risco.
- Teste regras de domínio unitariamente, persistência/tenancy em integração e fluxos críticos em E2E.
- Para toda operação tenant-scoped, inclua caso negativo de acesso cross-tenant. Para RBAC, inclua allow e deny.
- Teste timezone, UTC, centavos, E.164, CPF, concorrência, idempotência e assinatura de webhook quando aplicável.
- Não esconda falhas, warnings ou testes não executados. Não marque como aprovado algo bloqueado pelo ambiente.
- Não altere testes apenas para fazer uma implementação incorreta passar.

## Ambientes e integrações

- Respeite `docs/ENVIRONMENTS.md`; local, preview, staging e production possuem bancos e secrets separados.
- Dados reais são proibidos em desenvolvimento, preview e testes.
- Não configure Neon, Vercel, domínio, Asaas, Meta, e-mail, storage ou monitoramento fora da fase e autorização correspondentes.
- Verifique assinatura, replay, idempotência e associação ao tenant em webhooks antes de processar efeitos.

## Git, escopo e entrega

- Comece por `git status`, registre branch/HEAD e preserve alterações preexistentes.
- Crie a branch solicitada; não faça force-push, não reescreva histórico e não apague o protótipo ou documentos antigos.
- Faça mudanças mínimas e estritamente dentro do escopo. É proibido “aproveitar” para atualizar dependências, refatorar, corrigir UI ou adicionar funcionalidades não solicitadas.
- Commits devem ser coesos e usar a mensagem solicitada quando fornecida. Revise `git diff`, `git diff --check`, `git diff --stat` e `git status`.
- Um Pull Request não representa deploy; registre o que foi apenas proposto, executado e validado.

## Protocolo para Codex Cloud

- O Codex Cloud pode disponibilizar o commit selecionado em uma branch local chamada `work`.
- A ausência de uma branch local chamada `main` não é motivo para interromper uma tarefa.
- A ausência de `origin` ou de qualquer remote não é motivo para interromper uma tarefa.
- Quando o ambiente não possuir remote, o HEAD atual deve ser tratado como o snapshot autorizado da branch escolhida pelo usuário na interface do Codex.
- Não executar `git switch main`, `git pull`, `git fetch`, `git push` ou `gh pr create` quando não houver remote.
- Não criar outra branch dentro do ambiente cloud quando a plataforma já tiver criado a branch de trabalho.
- Verificar `git status`, branch atual e HEAD apenas para diagnóstico.
- Interromper apenas quando houver alterações preexistentes não relacionadas, conflito real ou dependência indispensável ausente.
- Implementar, validar e criar o commit local normalmente.
- A criação do Pull Request deve ser realizada pelo fluxo da interface do Codex quando não houver remote.
- Quando o ambiente possuir remote e credenciais, o fluxo Git convencional pode ser usado.
- Nunca declarar falha apenas porque a branch se chama `work`.
- Nunca exigir sincronização com `main` dentro da sandbox quando o snapshot já foi criado a partir da branch selecionada.

## Padrão do relatório final

Informe em português, com referências aos arquivos: resumo; arquivos criados/alterados; decisões e pendências; riscos; testes e comandos exatos com resultado; branch; commit; Pull Request; próxima fase. Confirme explicitamente se houve mudança funcional, instalação de dependência, deploy, criação de banco, execução de migration, configuração externa ou inclusão de secret. Nunca alegue conclusão de uma etapa que não foi executada e verificada.
