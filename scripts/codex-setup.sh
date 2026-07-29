#!/usr/bin/env bash
set -euo pipefail

# Setup script to initialize a reproducible Codex environment.
# - idempotent
# - does not create .env, does not run migrations, does not access DB
# - fails loudly if lockfile is out of date

corepack enable
corepack prepare pnpm@10.28.1 --activate

# Install pinned dependencies using the lockfile. This will fail if the lockfile
# is out of date, as requested.
pnpm install --frozen-lockfile

# Generate database client/artifacts without applying migrations.
# This command is expected to be safe and not run migrations or touch prod.
pnpm db:generate
