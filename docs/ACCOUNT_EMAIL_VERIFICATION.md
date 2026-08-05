# Verificação do e-mail principal

O PR 44 habilita a verificação manual e opcional do e-mail principal da conta pelo mecanismo nativo do Better Auth.

## Comportamento

- o endpoint manual exige uma sessão válida e aceita somente o e-mail da própria conta autenticada;
- contas existentes continuam podendo entrar sem e-mail verificado;
- a solicitação parte da tela de configurações autenticada;
- o link expira em 60 minutos e é consumido pelo Better Auth;
- a entrega usa o contrato transacional e o adapter Resend do PR 43;
- o registro de entrega guarda fingerprint HMAC, estado e uma referência derivada por SHA-256, nunca o e-mail, token ou URL em texto bruto;
- após a confirmação, `emailVerified` e `emailVerifiedAt` representam o estado da conta;
- bounce, complaint e suppression continuam respeitados pela camada transacional.

## Ambientes e efeitos externos

`EMAIL_PROVIDER=disabled` permanece o padrão. Este PR não cria conta Resend, API key, domínio, DNS, webhook externo ou envio real. Build, testes e CI não realizam rede nem exigem credenciais do provider.

## Fora do escopo

Troca do endereço principal, confirmação pelo endereço antigo, obrigatoriedade de verificação para login e entrega de convites ficam para PRs separados.
