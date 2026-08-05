# Governança de clientes e acessos da plataforma

## Papéis separados

O FlipSchedule possui dois contextos de acesso que não devem ser confundidos:

- **Operador da plataforma:** administra o SaaS em `/admin`. Não depende de Membership em uma clínica e não usa uma senha administrativa separada.
- **Usuário de clínica:** acessa somente os tenants para os quais possui Membership ativa.

A autenticação é a mesma. A autorização é determinada no servidor pelo registro `PlatformOperator` ou pela `Membership` tenant-scoped.

## Clínicas como clientes

Cada clínica cliente é representada por um `Tenant` isolado. Ao criar um cliente pelo painel administrativo, a operação cria de forma transacional:

1. o tenant;
2. a unidade principal;
3. o usuário proprietário;
4. a credencial com senha temporária protegida por hash;
5. a Membership `OWNER`;
6. a assinatura manual vinculada a um plano comercial;
7. o entitlement de acesso;
8. o registro de auditoria.

Se uma etapa falhar, a transação inteira é revertida.

## Entrada no sistema

O endereço público do aplicativo permanece `/login`.

Após autenticação:

- operador ativo da plataforma é direcionado para `/admin`;
- usuário de clínica com senha temporária é direcionado para `/first-access`;
- usuário com Membership ativa é direcionado para `/{tenantSlug}/dashboard`;
- usuário autenticado sem acesso liberado é direcionado para `/access-pending`.

Não existe cadastro público.

## Primeiro acesso

O fluxo `/first-access` pertence apenas aos acessos de clínicas provisionados com senha temporária. Um operador da plataforma não deve ser bloqueado por `mustChangePassword` herdado de um bootstrap antigo.

A promoção controlada para `PLATFORM_OWNER`:

- confirma que o usuário existe, está ativo e possui e-mail verificado;
- cria ou confirma o operador;
- remove a exigência de primeiro acesso;
- marca a conclusão do acesso inicial;
- revoga sessões existentes;
- registra auditoria;
- exige novo login.

## Planos

O catálogo `CommercialPlan` armazena código, nome, ciclo, preço, trial e limites comerciais. O painel Admin pode criar, ativar, inativar e arquivar planos.

A atribuição de plano pelo painel cria ou atualiza uma assinatura `MANUAL` e substitui o entitlement ativo da clínica. Isso não realiza cobrança externa e não aciona o Asaas.

## Suspensão e arquivamento

- `ACTIVE`: cliente operacional, sujeito às demais regras de entitlement e billing.
- `SUSPENDED`: acesso operacional bloqueado temporariamente, preservando os dados.
- `ARCHIVED`: cliente encerrado; entitlements ativos são revogados e os dados permanecem preservados.

O painel não remove fisicamente clínicas ou dados clínicos.

## Usuários adicionais

Depois que a clínica é criada, o proprietário e os gestores autorizados utilizam o fluxo de equipe do próprio tenant para convidar profissionais e colaboradores. O convite valida o e-mail e cria a Membership somente após aceite.

## Promoção inicial em produção

Após merge, migration e deploy aprovados, execute manualmente o workflow:

`Promote production platform owner`

Confirmação exigida:

`PROMOTE_PLATFORM_OWNER`

O workflow usa o e-mail já armazenado no secret `BOOTSTRAP_OWNER_EMAIL` e a conexão direta protegida do Neon. Nenhuma senha é lida, alterada ou exibida.

A execução revoga as sessões atuais. Depois dela, entre novamente em `/login`; o destino será `/admin`.

## Segurança

- nenhuma senha administrativa separada;
- nenhuma confiança em tenant enviado pelo navegador;
- ações administrativas protegidas por RBAC de plataforma;
- criação de clientes em transação serializável;
- senha temporária nunca é persistida em texto puro;
- e-mails são mascarados nas listagens;
- alterações de status e plano são auditadas;
- arquivamento preserva dados;
- workflow de produção é manual, protegido por Environment e confirmação explícita.
