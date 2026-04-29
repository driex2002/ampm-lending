#!/usr/bin/env bash
# ============================================================
# AMPM Lending — Rebuild script (Linux / macOS / Git Bash)
# Stops containers, rebuilds images, and restarts everything.
#
# Usage:
#   ./rebuild.sh                – rebuild normally (blocking)
#   ./rebuild.sh --clear-cache  – rebuild without Docker layer cache
# ============================================================

NO_CACHE=""

for arg in "$@"; do
  case "$arg" in
    --clear-cache) NO_CACHE="--no-cache" ;;
  esac
done

# ── Colour helpers ────────────────────────────────────────────
if [ -t 1 ]; then
  GREEN="\033[0;32m"; YELLOW="\033[1;33m"; NC="\033[0m"
else
  GREEN=""; YELLOW=""; NC=""
fi

echo ""
echo "============================================================"
echo "  AMPM Lending — Rebuild${NO_CACHE:+ (clear cache)}"
echo "============================================================"

echo -e "${YELLOW}Stopping running containers...${NC}"
docker compose down

echo -e "${YELLOW}Rebuilding and starting AMPM Lending System...${NC}"
docker compose build $NO_CACHE && docker compose up -d

echo ""
echo -e "${GREEN}Done! Application is running at http://localhost:3000${NC}"
echo -e "${GREEN}PostgreSQL is available at localhost:5432${NC}"
echo ""
echo "Use ./stop.sh to shut down."
