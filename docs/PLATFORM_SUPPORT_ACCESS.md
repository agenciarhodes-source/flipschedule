# Acesso temporário de suporte

`PlatformSupportGrant` é temporário, associado a um operador e um único tenant, exige motivo e expiração futura, pode ser revogado e é verificado em cada request. Não cria sessão, impersonação ou `Membership`, não concede escrita clínica e não se estende a outro tenant.

A visão permitida contém organização, status, configuração básica, contagens, integrações, billing, filas e logs sanitizados. São proibidos CPF, telefone/e-mail completos, prontuário, notas clínicas, mensagens descriptografadas, tokens, `credentialReference`, payload e ciphertext. Expirado ou revogado nega acesso por padrão.
