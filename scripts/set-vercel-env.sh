#!/usr/bin/env bash
# =============================================================================
# AMPM Lending — Set Vercel Environment Variables
# =============================================================================
# Usage:
#   1. Get your token: https://vercel.com/account/tokens
#   2. Run: VERCEL_TOKEN=your_token ./scripts/set-vercel-env.sh
#
# The script reads all secret values from your local .env file (project root).
# Nothing sensitive is hardcoded here — safe to commit.
# =============================================================================

set -e

TOKEN="${VERCEL_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  echo "ERROR: VERCEL_TOKEN is not set."
  echo "Usage: VERCEL_TOKEN=your_token_here ./scripts/set-vercel-env.sh"
  exit 1
fi

# Load values from .env in the project root
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found at $ENV_FILE"
  exit 1
fi

# Helper: read a value from .env by key
env_val() {
  local KEY="$1"
  grep -E "^${KEY}=" "$ENV_FILE" | head -1 | sed 's/^[^=]*=//' | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//"
}

PROJECT_SLUG="ampm-lending"
TEAM_SLUG="driex2002-9209s-projects"

echo "Looking up Vercel team and project IDs..."

# Get team ID
TEAM_ID=$(curl -sf "https://api.vercel.com/v2/teams?slug=${TEAM_SLUG}" \
  -H "Authorization: Bearer ${TOKEN}" | \
  grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TEAM_ID" ]; then
  echo "ERROR: Could not find team '${TEAM_SLUG}'. Check your token has access."
  exit 1
fi
echo "  Team ID: $TEAM_ID"

# Get project ID
PROJECT_ID=$(curl -sf "https://api.vercel.com/v9/projects/${PROJECT_SLUG}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | \
  grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: Could not find project '${PROJECT_SLUG}'."
  exit 1
fi
echo "  Project ID: $PROJECT_ID"
echo ""

# Helper: upsert a single env var
set_env() {
  local KEY="$1"
  local VALUE="$2"
  local TYPE="${3:-encrypted}"  # encrypted | plain | secret

  # Check if already exists
  EXISTING_ID=$(curl -sf \
    "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
    -H "Authorization: Bearer ${TOKEN}" | \
    python3 -c "import sys,json; envs=json.load(sys.stdin).get('envs',[]); matches=[e['id'] for e in envs if e['key']=='${KEY}']; print(matches[0] if matches else '')" 2>/dev/null || true)

  if [ -n "$EXISTING_ID" ]; then
    curl -sf -X PATCH \
      "https://api.vercel.com/v10/projects/${PROJECT_ID}/env/${EXISTING_ID}?teamId=${TEAM_ID}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"value\":$(echo "$VALUE" | python3 -c 'import sys,json;print(json.dumps(sys.stdin.read().rstrip()))'),\"type\":\"${TYPE}\",\"target\":[\"production\"]}" \
      > /dev/null
    echo "  UPDATED  $KEY"
  else
    curl -sf -X POST \
      "https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"key\":\"${KEY}\",\"value\":$(echo "$VALUE" | python3 -c 'import sys,json;print(json.dumps(sys.stdin.read().rstrip()))'),\"type\":\"${TYPE}\",\"target\":[\"production\"]}" \
      > /dev/null
    echo "  SET      $KEY"
  fi
}

echo "Reading values from .env..."
echo "Setting environment variables..."

# ── Database (Neon) ────────────────────────────────────────────────────────────
# NOTE: Override DATABASE_URL/DIRECT_URL with your Neon production URLs below,
# or set NEON_DATABASE_URL / NEON_DIRECT_URL environment variables before running.
DB_URL="${NEON_DATABASE_URL:-$(env_val DATABASE_URL)}"
DIRECT_DB_URL="${NEON_DIRECT_URL:-$(env_val DIRECT_URL)}"
set_env "DATABASE_URL" "$DB_URL"
set_env "DIRECT_URL"   "$DIRECT_DB_URL"

# ── Auth ──────────────────────────────────────────────────────────────────────
set_env "NEXTAUTH_SECRET" "$(env_val NEXTAUTH_SECRET)"
set_env "AUTH_SECRET"     "$(env_val AUTH_SECRET)"
set_env "NEXTAUTH_URL"    "https://ampm-lending.vercel.app"
set_env "AUTH_URL"        "https://ampm-lending.vercel.app"

# ── Google OAuth ──────────────────────────────────────────────────────────────
set_env "GOOGLE_CLIENT_ID"     "$(env_val GOOGLE_CLIENT_ID)"
set_env "GOOGLE_CLIENT_SECRET" "$(env_val GOOGLE_CLIENT_SECRET)"
set_env "AUTH_GOOGLE_ID"       "$(env_val AUTH_GOOGLE_ID)"
set_env "AUTH_GOOGLE_SECRET"   "$(env_val AUTH_GOOGLE_SECRET)"

# ── Email ─────────────────────────────────────────────────────────────────────
set_env "GMAIL_USER"         "$(env_val GMAIL_USER)"
set_env "GMAIL_APP_PASSWORD" "$(env_val GMAIL_APP_PASSWORD)"
set_env "SMTP_USER"          "$(env_val SMTP_USER)"
set_env "SMTP_PASSWORD"      "$(env_val SMTP_PASSWORD)"
set_env "EMAIL_FROM"         "$(env_val EMAIL_FROM)"
set_env "EMAIL_FROM_NAME"    "$(env_val EMAIL_FROM_NAME)"

# ── App ───────────────────────────────────────────────────────────────────────
set_env "NEXT_PUBLIC_APP_URL"     "https://ampm-lending.vercel.app" "plain"
set_env "NEXT_PUBLIC_APP_NAME"    "$(env_val NEXT_PUBLIC_APP_NAME)" "plain"
set_env "NEXT_PUBLIC_APP_VERSION" "$(env_val NEXT_PUBLIC_APP_VERSION)" "plain"

# ── Security ──────────────────────────────────────────────────────────────────
set_env "MAX_LOGIN_ATTEMPTS"         "$(env_val MAX_LOGIN_ATTEMPTS)"         "plain"
set_env "LOGIN_LOCKOUT_MINUTES"      "$(env_val LOGIN_LOCKOUT_MINUTES)"      "plain"
set_env "TEMP_PASSWORD_EXPIRY_HOURS" "$(env_val TEMP_PASSWORD_EXPIRY_HOURS)" "plain"

# ── Node ─────────────────────────────────────────────────────────────────────
set_env "NODE_ENV" "production" "plain"

echo ""
echo "Done! Trigger a Vercel redeploy to apply the new env vars:"
echo "  https://vercel.com/driex2002-9209s-projects/ampm-lending"
