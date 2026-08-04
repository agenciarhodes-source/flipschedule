# Rate limiting e proteção contra abuso

`SecurityRateLimitBucket` é durável, tenant-aware e atualizado em transação serializável. Identidades compostas são convertidas por HMAC-SHA-256 usando `RATE_LIMIT_HASH_KEY`; IP, e-mail e token nunca são persistidos em claro e IP nunca deve ser identidade única. Escopo, limite, janela e bloqueio são validados. Secret ausente falha fechado no runtime protegido, mas não no import/build.

A migration precisa de ensaio. `ops:cleanup-rate-limits` remove lote limitado expirado. A integração oficial do Better Auth 1.2 usada atualmente não oferece neste repositório um ponto comprovado para limiter durável antes da verificação de senha; rate limiting de login e a cobertura completa de convite, orçamento, checkout, admin e webhook permanecem **bloqueantes do piloto** até integração e testes end-to-end. Não foi usado `Map` em memória.

O hash v2 inclui scope e marcador explícito `tenant:<id confiável>` ou `global`. Antes da janela atual, o limiter consulta penalidade durável ainda ativa, impedindo evasão na virada de janela. Recuperação concorrente permanece serializável.
