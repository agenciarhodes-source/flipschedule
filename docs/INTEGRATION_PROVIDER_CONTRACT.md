# Contrato de providers

`IntegrationProviderAdapter` é o limite obrigatório para configuração, health check, assinatura, parsing e envio. O `ProviderRegistry` é explícito e deny-by-default; nenhuma importação deriva de entrada do cliente. Erros possuem somente códigos sanitizados.

Um adapter real só pode ser registrado após documentação oficial de endpoint, versão, assinatura, replay, campos, credenciais e ambiente não produtivo. Cada provider terá schema Zod `.strict()` próprio. Health check confirmado é o único caminho `PENDING → CONNECTED`; confirmação com identificador externo é o único caminho de mensagem para `SENT`.

A verificação de assinatura pertence ao adapter e deve seguir o algoritmo oficial, comparação em tempo constante e janela de replay quando o contrato suportar. Não existe assinatura genérica. O fake vive exclusivamente em helpers de teste.

Reconciliação é capacidade opcional. Build, imports e testes unitários não executam health check, reconciliação ou qualquer rede.
