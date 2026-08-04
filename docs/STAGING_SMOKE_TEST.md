# Smoke test de staging

Configure `STAGING_BASE_URL` HTTPS como variável protegida e hostname production distinto. O workflow manual valida live, ready (`2xx` e `status=ready`), login, raiz segura, `X-Robots-Tag` e marcador de homologação. Não usa conta, cookie, token ou dado clínico. Smoke autenticado permanece opcional até existir credencial sintética protegida e mecanismo seguro.
