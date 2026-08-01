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
- public signup stays disabled;
- the first-access and reset-password flows are intentionally pending;
- production secrets must be rotated regularly and must never be committed.
