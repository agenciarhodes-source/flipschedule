# Baseline de segurança

Estes controles são mínimos, não checklist exaustivo. Dados de saúde e PII elevam o impacto; exceções exigem risco documentado, responsável e prazo.

## Rotas e sessões

- Rotas privadas e mutações verificam sessão no servidor e negam por padrão; middleware sozinho não substitui autorização no serviço.
- Sessões têm expiração, rotação/revogação, proteção contra fixation e cookies `HttpOnly`, `Secure` e `SameSite` adequados.
- Aplicar CSRF para autenticação baseada em cookie, proteção contra enumeração, brute force e abuso em login/recovery.
- Links públicos usam tokens opacos de alta entropia, armazenados de forma protegida quando possível, com escopo, expiração, revogação e resposta minimizada.

## Isolamento tenant e RBAC

- Tenant é derivado de sessão + membership ativa. Rejeitar qualquer `tenant_id` client-side como fonte de autoridade.
- Serviços/repositórios recebem contexto tenant confiável; toda query e mutação tenant-scoped o aplica.
- Validar relações no mesmo tenant e testar IDOR por IDs/slugs trocados. Constraints reforçam isolamento quando praticável.
- RBAC é server-side, por ação/recurso, com mínimo privilégio. Alteração de role, impersonation e acesso de suporte exigem auditoria e, quando aplicável, expiração/aprovação.

## Webhooks, idempotência e rate limiting

- Verificar assinatura/segredo sobre corpo correto, timestamp e replay antes de processar.
- Persistir identificador único de evento e resultado; retries não duplicam cobrança, mensagem ou transição.
- Rate limiting por risco, identidade, tenant e origem, com proteção especial para auth, páginas públicas e webhooks; não usar IP como única identidade.
- Responder webhooks rapidamente e mover efeitos para job confiável, com retries limitados e reconciliação.

## Secrets e supply chain

- Secrets somente em gerenciadores dos ambientes, com menor escopo, rotação e separação. Variáveis `NEXT_PUBLIC_*` nunca contêm segredo.
- Secret detectado no Git é incidente: revogar/rotacionar antes de apenas removê-lo.
- Lockfile, revisão de dependências, scanners, atualizações controladas e build provenance/SBOM conforme maturidade.

## Auditoria e logs

- `AuditLog` registra ator, tenant, ação, recurso opaco, resultado, tempo UTC e metadados mínimos; é protegido contra alteração e tem retenção definida.
- Logs operacionais estruturados usam correlation ID e redaction. Nunca registrar CPF, telefone, e-mail, endereço, mensagens, dados clínicos, cookies, tokens, chaves ou payload integral.
- Acesso aos logs é restrito e auditado; erros ao usuário não revelam stack, query ou existência de recurso alheio.

## LGPD e dados de saúde

- Manter inventário de dados, finalidade/base legal, papéis, suboperadores e retenção. Consentimento é versionado e revogável quando for a base aplicável.
- Minimizar coleta e exposição; criptografia em trânsito e em repouso; acesso restrito e rastreável.
- Implementar processos verificados de acesso, correção, portabilidade quando aplicável, exclusão/anonimização e resposta a incidente.
- Exclusão respeita obrigação legal e integridade financeira/auditável; quando não puder apagar, restringir e anonimizar conforme decisão jurídica.

## Backups e recuperação

- Backups separados, criptografados, com acesso mínimo, retenção e região aprovadas.
- Definir RPO/RTO antes da produção; testar restore regularmente e registrar evidência.
- Migration e operações de risco exigem backup/restore aplicável e runbook. Backups também obedecem retenção/exclusão.

## Critérios mínimos antes do piloto

Threat model atualizado; testes cross-tenant/RBAC; revisão de rotas públicas; secrets scan; verificação de webhooks; restore testado; plano de incidente; revisão LGPD/jurídica; rate limits; auditoria e redaction verificadas; vulnerabilidades críticas tratadas ou formalmente bloqueantes.

## Integrações e filas

Credentials são aliases resolvidos server-side; configuração rejeita secrets. Webhooks exigem adapter/assinatura oficial antes da persistência, payload cifrado e idempotência. Claims são condicionais, retries finitos e logs usam allowlist sem PII/payload.
