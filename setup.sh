#!/usr/bin/env bash
# =============================================================================
# AMPM Lending — First-Time Setup Script
# Compatible with: Linux, macOS, Git Bash on Windows
# =============================================================================
# Prerequisites (must be installed before running this script):
#   - Docker Desktop (includes Compose V2)
#   - Git Bash (on Windows) or any bash shell (on Linux/macOS)
#
# Usage (first time on a fresh clone):
#   chmod +x setup.sh        # mark executable (Linux/macOS only, once)
#   ./setup.sh
#
# What this script does:
#   1. Creates .env from .env.example (skips if .env already exists)
#   2. Auto-generates and writes NEXTAUTH_SECRET into .env
#   3. Builds the Docker image and starts all containers
#   4. Waits for the database and app to be healthy
#   5. Seeds the database (admin account, loan terms, settings)
# =============================================================================

set -e  # exit immediately on any error

# ── Colour helpers ────────────────────────────────────────────────────────────
# Degrade gracefully if the terminal does not support ANSI colours
if [ -t 1 ]; then
  GREEN="\033[0;32m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; NC="\033[0m"
else
  GREEN=""; YELLOW=""; RED=""; NC=""
fi

step() { echo -e "${GREEN}[$1/5]${NC} $2"; }
warn() { echo -e "${YELLOW}WARN:${NC}  $1"; }
die()  { echo -e "${RED}ERROR:${NC} $1"; exit 1; }

echo ""
echo "============================================================"
echo "  AMPM Lending — First-Time Setup"
echo "============================================================"
echo ""

# ── Guard: Docker must be running ────────────────────────────────────────────
docker info > /dev/null 2>&1 || die "Docker is not running. Start Docker Desktop and try again."

# ── Step 1: Create .env ───────────────────────────────────────────────────────
step 1 "Preparing environment file..."
if [ -f .env ]; then
  warn ".env already exists — skipping copy. Delete it to reset from scratch."
else
  cp .env.example .env
  echo "      Created .env from .env.example."
fi

# ── Step 2: Generate NEXTAUTH_SECRET ─────────────────────────────────────────
step 2 "Configuring NEXTAUTH_SECRET..."
# openssl is bundled with Git Bash, Linux, and macOS — no extra install needed
if grep -q 'NEXTAUTH_SECRET="replace_with_your_generated_secret"' .env; then
  SECRET=$(openssl rand -base64 32)
  # Use | as the sed delimiter to avoid conflicts with / characters in base64
  sed -i "s|NEXTAUTH_SECRET=\"replace_with_your_generated_secret\"|NEXTAUTH_SECRET=\"${SECRET}\"|" .env
  echo "      Generated and saved NEXTAUTH_SECRET to .env."
else
  echo "      NEXTAUTH_SECRET is already set — skipping."
fi

# ── Step 3: Build image and start containers ──────────────────────────────────
step 3 "Building Docker image and starting containers..."
echo "      (First run takes a few minutes — npm install + Next.js compile)"
docker compose up -d --build

# ── Step 4: Wait for containers to be healthy ─────────────────────────────────
step 4 "Waiting for containers to be healthy..."

# 4a. Wait for Postgres healthcheck to pass
echo -n "      PostgreSQL"
until [ "$(docker inspect --format='{{.State.Health.Status}}' ampm-postgres 2>/dev/null)" = "healthy" ]; do
  printf "."
  sleep 2
done
echo " ✓"

# 4b. Wait for the app container to be running (not restarting)
echo -n "      Next.js app"
RETRIES=40
until [ "$(docker inspect --format='{{.State.Status}}' ampm-app 2>/dev/null)" = "running" ]; do
  RETRIES=$((RETRIES - 1))
  [ $RETRIES -le 0 ] && die "ampm-app failed to start. Check logs: docker logs ampm-app"
  printf "."
  sleep 3
done
echo " ✓"

# 4c. Wait until Next.js signals it is ready in the container logs.
#     The entrypoint runs `prisma migrate deploy` before starting the server,
#     so "Ready in" appearing in the logs means migrations are done.
echo -n "      Waiting for Next.js ready signal"
RETRIES=25
until docker logs ampm-app 2>&1 | grep -q "Ready in"; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    warn "Ready signal not detected — continuing anyway."
    break
  fi
  printf "."
  sleep 2
done
echo " ✓"

# ── Step 5: Seed the database ─────────────────────────────────────────────────
step 5 "Seeding the database (admin account, loan terms, interest configs, settings)..."
# prisma db seed reads the "prisma.seed" field in package.json and runs:
#   tsx prisma/seed.ts
# tsx is bundled inside the container (see Dockerfile).
docker exec ampm-app node ./node_modules/prisma/build/index.js db seed

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  Setup complete!"
echo ""
echo "  Application:    http://localhost:3000"
echo ""
echo "  Sign in using Google OAuth with driex2002@gmail.com"
echo "  (First login auto-provisions the super admin account)"
echo ""
echo "  Useful commands:"
echo "    Start:    ./start.sh"
echo "    Stop:     ./stop.sh"
echo "    Logs:     docker logs ampm-app -f"
echo "    DB seed:  docker exec ampm-app node ./node_modules/prisma/build/index.js db seed"
echo "============================================================"
echo ""
