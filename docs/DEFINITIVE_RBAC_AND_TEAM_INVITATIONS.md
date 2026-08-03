# RBAC definitivo e convites de equipe

## Escopo entregue

O RBAC está centralizado em `domains/application/rbac.ts`. Toda permissão é tipada e negada por padrão. `OWNER` administra convites, papéis, suspensão, revogação e transferência de propriedade; `MANAGER` pode consultar a equipe, mas não executar mutações sensíveis. Os papéis operacionais recebem somente as capacidades descritas na matriz do código, e o escopo `own`/`assigned` continua sendo aplicado pelos adapters tenant-scoped.

`TenantInvitation` separa convite de identidade: nenhuma conta incompleta ou usuário placeholder é criado. O token opaco possui 256 bits, apenas seu SHA-256 é persistido, expira em sete dias e pode ser rotacionado ou revogado. O link usa `/convite#token=...`; o navegador remove o fragmento antes da validação por Server Action. Não há envio de e-mail: o proprietário copia o link manualmente.

## Invariantes de segurança

- tenant e ator vêm exclusivamente de sessão e `Membership` ativa;
- convites pendentes equivalentes são rejeitados dentro de transação serializável;
- aceitação exige sessão cujo e-mail normalizado seja o e-mail convidado;
- aceite cria ou reativa a `Membership` e consome o convite atomicamente;
- alteração ou remoção do último `OWNER` ativo é negada;
- transferência exige outro membro ativo e confirmação exata do nome da organização;
- alterações são registradas em `AuditLog` sem token ou e-mail nos metadados;
- convite `OWNER` não é permitido; propriedade só muda pelo fluxo reforçado.

## Migration e operação

`20260803120000_add_tenant_invitations` cria somente a tabela, índices e relações de convites. É aditiva, não altera dados clínicos e não foi aplicada em produção. Antes de deploy: revisar backup, executar a migration no ambiente autorizado separadamente, validar índices/FKs e realizar smoke test de convite. Como forward-fix, desabilitar a UI/actions de equipe e corrigir a tabela de forma aditiva; remover a tabela descartaria histórico e não é o rollback recomendado após uso.

## Limites

O cadastro público continua fora da arquitetura atual. Uma pessoa sem conta deve ter uma conta criada pelo fluxo de identidade autorizado antes de entrar e aceitar; a aplicação não cria conta fantasma. O contrato de entrega futura poderá receber o link bruto em memória, mas nenhum adapter de e-mail é executado neste PR.
