# Segurança de autenticação em staging

Staging e production são runtimes públicos seguros. Ambos exigem `BETTER_AUTH_SECRET` distinto das demais chaves, não-placeholder e com ao menos 32 caracteres; não existe fallback. `BETTER_AUTH_URL` e todas as trusted origins devem ser origens HTTPS absolutas, sem wildcard, localhost, credenciais, path, query ou fragmento. Duplicatas são normalizadas e a URL base deve estar na lista.

Better Auth usa cookies `Secure` nesses dois ambientes; as garantias HttpOnly e SameSite permanecem sob a configuração do Better Auth, sem domínio amplo ou decisão baseada em header do cliente. Development/test conservam defaults locais controlados.
