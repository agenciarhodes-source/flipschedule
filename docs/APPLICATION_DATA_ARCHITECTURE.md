# Arquitetura de dados da aplicação

Componentes dependem de contratos e view models; serviços server-only dependem de Prisma. `ApplicationContext` deriva sessão e Membership ACTIVE validada, inclusive quando uma rota solicita slug. Preferência em cookie HttpOnly não autoriza e é revalidada.

Integrações e filas usam colunas explícitas, não metadata. Queries e claims carregam `tenantId`; relações de conversa, integração, mensagem e consentimento são validadas no mesmo tenant. Conteúdo de mensagem e webhook usa ciphertext e não possui fallback em texto puro.
