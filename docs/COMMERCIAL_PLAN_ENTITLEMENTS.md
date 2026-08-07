# Entitlements e limites dos planos comerciais

## Objetivo

O PR 60 transforma `CommercialPlan.maxClinics` e `CommercialPlan.maxUsers` de metadados de catálogo em regras comerciais aplicadas no servidor. A finalidade é impedir expansão de uso acima do contratado sem acoplar regras a nomes de planos ou à interface.

## Plano aplicável

Os limites são resolvidos por `tenantId` a partir da assinatura mais recentemente atualizada que esteja vinculada a um `CommercialPlan` e ainda esteja em estado `PENDING`, `ACTIVE`, `PAST_DUE` ou `SUSPENDED`.

Assinaturas `CANCELLED` e `EXPIRED` não são usadas para definir limites. Tenants legados sem uma assinatura vinculada a `CommercialPlan` permanecem sem medição neste PR para evitar regressão implícita; a regularização comercial desses tenants deve ocorrer pelo fluxo administrativo de atribuição de plano.

O status do catálogo (`ACTIVE`, `INACTIVE` ou `ARCHIVED`) não remove retroativamente os limites de uma assinatura existente. Esse status controla disponibilidade comercial do plano, não o contrato já atribuído.

## Semântica dos limites

- `maxClinics = null`: quantidade de unidades ativas ilimitada.
- `maxUsers = null`: quantidade de usuários ativos ilimitada.
- `maxClinics = N`: no máximo `N` registros `Clinic` com status `ACTIVE` no tenant.
- `maxUsers = N`: no máximo `N` Memberships com status `ACTIVE` no tenant.
- unidade `INACTIVE` não consome capacidade; reativação volta a validar o limite.
- Membership `SUSPENDED` ou `REVOKED` não consome assento ativo; reativação volta a validar o limite.
- convite pendente válido reserva um assento durante a criação de novos convites, evitando overbooking deliberado; o aceite também revalida a capacidade contra Memberships ativas.
- convite expirado, revogado ou aceito não conta como reserva pendente.

## Pontos de enforcement

### Unidades

`ClinicService.create` valida capacidade antes de criar uma unidade ativa. `ClinicService.update` valida novamente quando uma unidade inativa é reativada. As operações usam transação serializável para que a leitura do consumo e a mutação pertençam ao mesmo limite de concorrência.

### Usuários

`TeamService.invite` considera usuários ativos e convites pendentes válidos. `PublicInvitationService.accept` revalida usuários ativos imediatamente antes de criar/reativar a Membership. A reativação administrativa de uma Membership também revalida `maxUsers`.

### Mudança de plano

`PlatformCustomerAdministrationService.assignPlan` rejeita um plano cujo `maxClinics` ou `maxUsers` seja menor que o consumo ativo atual. Assim, downgrade não cria um tenant instantaneamente fora do contrato.

## Resposta ao usuário

Limites atingidos retornam conflito de negócio (`CONFLICT`) nos fluxos tenant-scoped, com mensagem em pt-BR orientando upgrade. A mensagem contém apenas o limite contratado; não inclui e-mail, telefone, CPF, nome de paciente ou outro dado pessoal.

## Concorrência e tenancy

Todas as contagens são filtradas por `tenantId`. Os pontos que combinam contagem e criação/reativação usam transações com isolamento `Serializable`, de forma que requisições concorrentes não sejam tratadas como autorizações independentes sem conflito transacional.

## Compatibilidade e não objetivos

- Nenhuma migration é necessária: os campos comerciais já existem no schema Prisma.
- Nenhuma dependência nova é adicionada.
- Nenhum preço, nome de tier ou pacote comercial é inventado neste PR.
- `CommercialPlan.features` continua reservado para feature gates futuros. Chaves e semântica de features precisam ser aprovadas antes de enforcement para evitar transformar backlog em decisão comercial implícita.
- Este PR não configura Asaas production, checkout real, secrets, deploy ou infraestrutura externa.

## Critérios de aceite

1. plano com limite nulo não bloqueia expansão;
2. criação de unidade ativa acima de `maxClinics` é recusada;
3. reativação de unidade acima de `maxClinics` é recusada;
4. convite que excederia `maxUsers`, considerando reservas pendentes, é recusado;
5. aceite de convite e reativação de usuário revalidam `maxUsers`;
6. atribuição de plano menor que o uso ativo é recusada;
7. consultas de consumo e plano permanecem tenant-scoped;
8. invariantes de expansão são protegidas contra concorrência por transações serializáveis;
9. tenants sem `CommercialPlan` aplicável preservam o comportamento anterior;
10. testes automatizados cobrem política, wiring e proteção de downgrade.
