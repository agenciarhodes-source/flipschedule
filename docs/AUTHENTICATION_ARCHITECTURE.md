# FlipSchedule authentication architecture

## Overview

FlipSchedule uses Better Auth with a Prisma adapter over PostgreSQL. The authentication foundation is intentionally limited to email and password sign-in, server-side session validation and tenant resolution from a validated membership.

## Core models

- AuthSession: stores the user session record persisted in the database.
- AuthAccount: stores credential-based account data and password hash linkage.
- AuthVerification: stores verification and future reset-password tokens.

The existing User model remains the principal identity and now carries a boolean emailVerified flag plus relations to the Better Auth models.

## Login and logout

- Login uses the Better Auth email/password client and normalizes the submitted email before sending it.
- Logout revokes the current session through Better Auth and redirects the user to /login.
- The login page avoids public signup and uses generic credential-error messaging.

## Server-side session context

The server context resolves session, user status, membership status and tenant status before allowing access. Tenant information is derived from the active membership, never from client input.

## Security notes

- secrets come from environment variables only;
- Better Auth is initialized lazily only when a request needs it, so route-module imports and Preview builds do not require production secrets;
- production requests fail with a sanitized unavailable response when authentication is not configured;
- public signup stays disabled;
- o bootstrap idempotente cria a credencial inicial sem armazenar senha em `User`;
- usuários marcados com `mustChangePassword` somente acessam `/first-access`; a conclusão troca o hash, revoga outras sessões e é auditada;
- o fluxo de reset-password continua pendente;
- production secrets must be rotated regularly and must never be committed.
