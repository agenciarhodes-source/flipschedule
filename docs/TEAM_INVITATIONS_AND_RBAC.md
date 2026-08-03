# Equipe, convites e tenant ativo

O convite usa token de 256 bits, persiste apenas SHA-256 e transporta o bruto somente no fragmento. Rotação substitui o hash e devolve o novo link uma vez. Aceite retorna Membership e slug, grava preferência HttpOnly/Lax/Secure em produção e redireciona ao tenant aceito sem remover outras memberships.

Usuários multi-tenant podem selecionar organização. Slug/cookie são intenção: o servidor exige Membership ACTIVE e tenant ACTIVE em cada request. O fallback usa data de aceite/criação e slug, nunca ordenação de UUID.
