#!/bin/sh
# =============================================================================
# AMPM Lending — Container Entrypoint
# =============================================================================
# Runs Prisma migrations then hands off to the Next.js server.
#
# Why we call `node .../prisma/build/index.js` instead of `npx prisma`:
#   `npx prisma` checks the npm registry for the latest version at runtime and
#   downloads it if the local CLI is missing or outdated. Prisma v7+ introduced
#   a breaking change — it no longer supports the legacy schema syntax used in
#   prisma/schema.prisma (url = env("DATABASE_URL")). Using npx would silently
#   upgrade to v7 and crash with "Invalid schema" on every container start.
#
#   Calling the CLI entry point directly (node .../index.js) bypasses npx and
#   guarantees the pinned v5.22.0 CLI (bundled in the Docker image) is used.
#
# Why we don't use ./node_modules/.bin/prisma:
#   The .bin/prisma wrapper script uses a hardcoded relative require path for
#   prisma_schema_build_bg.wasm. When Node resolves that relative to the .bin/
#   directory, it fails with ENOENT because the wasm lives in prisma/build/.
#   Invoking index.js directly avoids that path-resolution issue entirely.
# =============================================================================
set -e

echo "Running Prisma migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Starting Next.js application..."
exec node server.js
