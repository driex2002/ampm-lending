# =============================================================================
# AMPM Lending — Multi-stage Dockerfile
# =============================================================================
# Three-stage build:
#   deps    → install npm packages
#   builder → generate Prisma client + compile Next.js
#   runner  → lean production image (no dev tools, non-root user)
#
# Why we bundle the Prisma CLI in the runner stage:
#   If the CLI is missing, `docker-entrypoint.sh` would fall back to `npx prisma`
#   which downloads the latest version at runtime. Prisma v7+ introduced a
#   breaking change that removed support for the old `url = env("DATABASE_URL")`
#   schema syntax, causing the container to crash on startup. By copying the
#   pinned v5.22.0 CLI from the builder stage we guarantee the same version is
#   used at build time and at runtime.
# =============================================================================

# ── Stage 1: dependencies ─────────────────────────────────────────────────────
# Install all npm packages once and cache this layer. The builder stage copies
# node_modules from here so it never has to run `npm install` again.
FROM node:20-alpine AS deps
# libc6-compat  → required by some native binaries on Alpine
# openssl       → required by Prisma query engine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
# --legacy-peer-deps: some packages (react-day-picker, etc.) declare peer deps
# that conflict with React 19 in strict mode; this flag relaxes the check.
RUN npm install --legacy-peer-deps

# ── Stage 2: builder ──────────────────────────────────────────────────────────
# Generate the Prisma client and compile Next.js into a standalone output.
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client — creates /app/node_modules/.prisma/client
RUN npx prisma generate

# Build Next.js application (output: standalone)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
# Minimal production image. Only the compiled Next.js app, Prisma runtime
# files, and the pinned Prisma CLI are included — no source code or dev deps.
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user for security (principle of least privilege)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ── Next.js standalone output ─────────────────────────────────────────────────
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ── Prisma runtime files ──────────────────────────────────────────────────────
# prisma/         → schema.prisma + migrations (needed for `migrate deploy`)
# node_modules/.prisma → generated query engine binary
# node_modules/@prisma → Prisma client library
# node_modules/prisma  → Prisma CLI package (pinned v5.22.0)
# node_modules/.bin/prisma → CLI wrapper script
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# The .bin/prisma wrapper script resolves prisma_schema_build_bg.wasm using
# a hardcoded relative path `./prisma_schema_build_bg.wasm` (relative to its
# own directory). The actual wasm file lives in node_modules/prisma/build/ but
# is NOT present in .bin/ by default. Copying it here prevents the ENOENT
# error:  "Cannot find module ./prisma_schema_build_bg.wasm"
# NOTE: We no longer call .bin/prisma directly (see docker-entrypoint.sh),
# but we keep this copy in case the wrapper is ever invoked indirectly.
COPY --from=builder /app/node_modules/prisma/build/prisma_schema_build_bg.wasm ./node_modules/.bin/prisma_schema_build_bg.wasm

# Copy tsx so the seed script can run inside the container.
# tsx is a devDependency and is NOT included in the Next.js standalone output.
# The seed command (prisma db seed) reads package.json and executes:
#   tsx prisma/seed.ts
# Without tsx in node_modules/.bin/ this command fails with "command not found".
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

# ── Startup script ────────────────────────────────────────────────────────────
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
