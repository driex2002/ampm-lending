#!/bin/bash
# ============================================================
# AMPM Lending — Quick-start script (Linux / macOS / Git Bash)
# ============================================================
# FIRST-TIME SETUP: run ./setup.sh instead of this script.
# This script is for subsequent starts after the initial setup.
# ============================================================
set -e

echo "Starting AMPM Lending System..."
docker compose up -d
echo ""
echo "Application is running at http://localhost:3000"
echo "PostgreSQL is available at localhost:5432"
echo ""
echo "FIRST TIME? Run ./setup.sh instead — it builds the image and seeds the DB."
echo ""
echo "Use ./stop.sh to shut down."
