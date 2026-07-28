# Requisitos de produto — FlipSchedule

## Visão

FlipSchedule é um SaaS multi-tenant para centralizar operação comercial e de agenda de clínicas odontológicas e médicas. O produto conecta atendimento, agenda, CRM, pacientes, propostas de tratamento e comunicação, dando visibilidade operacional ao gestor sem substituir, nesta definição, um prontuário clínico completo.

## Público e problemas

O público são clínicas que hoje distribuem atendimento, marcações, leads e orçamentos entre canais e controles desconectados. O FlipSchedule busca reduzir perda de leads, conflitos de agenda, demora no atendimento, falta de acompanhamento de propostas e baixa visibilidade de conversão/ocupação.

## Perfis de usuário

| Perfil | Necessidade principal | Limite esperado |
|---|---|---|
| Owner | Configurar tenant, acompanhar indicadores e administrar acesso | Somente tenant(s) em que possui membership |
| Manager | Operar equipe, agenda, CRM e relatórios | Ações delegadas pelo RBAC |
| Receptionist | Atender, cadastrar pacientes, agendar e enviar propostas | Sem administração sensível/billing por padrão |
| Professional | Consultar própria agenda e propostas relacionadas | Escopo profissional configurado |
| Time FlipSchedule | Operação administrativa futura | Acesso excepcional, explícito, auditado e com prazo |

Os nomes finais de roles e permissões serão aprovados na fase de autenticação; a tabela expressa necessidades, não concede permissões automaticamente.

## Módulos confirmados

- Landing e acesso autenticado.
- Dashboard operacional.
- Agenda de profissionais, recursos, horários e bloqueios.
- CRM de leads por estágios.
- Inbox/conversas e mensagens.
- Pacientes e consentimentos.
- Orçamentos/planos de tratamento e página pública segura.
- Configurações: clínicas, profissionais, procedimentos, recursos e horários.
- Multi-clínica dentro de um tenant.
- Assinatura/cobrança recorrente com Asaas.
- WhatsApp Cloud API e, em fases futuras definidas, Instagram, Messenger e Facebook Lead Ads.
- Auditoria, LGPD e relatórios necessários à operação.

Super Admin, prontuário/odontograma, PDF, automações avançadas, IA e portal LGPD aparecem no backlog histórico, mas não entram no MVP sem requisitos e aprovação adicionais.

## Fluxos críticos

1. Usuário autentica, sessão é validada e tenant é resolvido por membership ativa.
2. Recepção localiza/cria paciente com telefone E.164 e consentimento apropriado.
3. Recepção agenda consulta respeitando timezone, disponibilidade, profissional, recurso e concorrência.
4. Lead percorre etapas do funil com autoria e histórico auditável.
5. Profissional/recepção cria plano em centavos; envio gera acesso público seguro, expirável e rastreável.
6. Paciente visualiza e aceita/rejeita plano com consentimento e validação CPF conforme finalidade definida.
7. Inbox associa mensagens ao tenant e contato; webhooks oficiais são verificados e idempotentes.
8. Owner acompanha indicadores do próprio tenant e gerencia assinatura.

## Regras de negócio

- O tenant vem da sessão autenticada; nunca de `tenant_id` do navegador. Slug não autoriza acesso.
- Valores monetários são inteiros em centavos e cálculos usam aritmética inteira.
- Instantes são persistidos em UTC e exibidos no timezone IANA do tenant.
- Telefones são normalizados em E.164; CPF é validado antes do uso e recebe proteção proporcional ao risco.
- Entidades relacionadas devem pertencer ao mesmo tenant; o servidor valida referências.
- Um agendamento não pode conflitar com regras confirmadas de profissional/recurso; invariantes detalhadas serão especificadas na fase do módulo.
- Mudanças sensíveis e integrações geram eventos de auditoria sem PII em logs comuns.
- Webhooks e pagamentos são idempotentes; estados externos não são inferidos apenas pela resposta do navegador.
- Acesso público a orçamento usa token opaco protegido, expiração e minimização de dados.

## Requisitos não funcionais

- Segurança por padrão, mínimo privilégio, isolamento tenant e defesa em profundidade.
- Interface pt-BR, responsiva e acessível, preservando a identidade visual do protótipo.
- Código e nomes internos em inglês; TypeScript estrito e validação runtime com Zod.
- Observabilidade com correlação e redaction; disponibilidade e metas de desempenho serão quantificadas antes do piloto.
- Deploy e migrations reproduzíveis, reversíveis quando possível e separados por ambiente.
- Testes automatizados para domínio, RBAC, tenancy, integrações e fluxos críticos.
- Backups e recuperação testados antes de produção.

## LGPD e dados de saúde

Aplicam-se minimização, finalidade, base legal documentada, controle de acesso, retenção, exportação, correção, exclusão/anonimização quando cabível e registro de consentimentos. Dados de saúde recebem proteção reforçada. Logs comuns não podem conter CPF, telefone, e-mail, mensagem ou dado clínico. Requisitos jurídicos finais, prazos de retenção e papéis de controlador/operador dependem de validação jurídica antes do piloto.

## MVP

O MVP inclui fundação segura; autenticação e RBAC; tenant/clínica/memberships; pacientes/consentimentos; profissionais/procedimentos/recursos/horários; agenda; CRM; orçamentos e página pública; dashboard essencial; auditoria; ambientes e operação; cobrança recorrente Asaas; WhatsApp oficial necessário ao fluxo de atendimento. A inclusão do WhatsApp no lançamento depende da aprovação operacional da Meta e pode ser controlada por feature flag no piloto.

## Versões futuras

Instagram, Messenger e Lead Ads completos (Fase 8); super administração cross-tenant; prontuário/odontograma; geração avançada de PDF; automações e régua sofisticada; IA; portal LGPD; criativos e integrações adicionais. Nada nesta lista deve ser implementado sem requisitos, threat model e critérios de aceite próprios.

## Fora desta fase documental

Nenhum módulo, schema, login, integração, banco, domínio ou infraestrutura é implementado por este documento.
