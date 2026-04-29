#!/bin/bash
# ============================================================
# AMPM Lending — Rebuild script (Linux / macOS / Git Bash)
# Stops containers, rebuilds images, and restarts everything.
# Usage: ./rebuild.sh
# ============================================================
set -e

echo "Stopping AMPM Lending System..."
docker compose down

echo ""
echo "Rebuilding and starting AMPM Lending System..."
docker compose up -d --build

echo ""
echo "Application is running at http://localhost:3000"
echo "PostgreSQL is available at localhost:5432"
echo ""
echo "Use stop.sh to shut down."
