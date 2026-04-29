#!/bin/bash
# ============================================================
# AMPM Lending — Quick-start script (Linux / macOS / Git Bash)
# ============================================================
# FIRST-TIME SETUP (run these steps once before using this script):
#
#   1. Copy environment file:
#        cp .env.example .env
#
#   2. Set a secret in .env — open it and replace NEXTAUTH_SECRET value.
#      Generate one with:
#        openssl rand -base64 32
#
#   3. Start containers:
#        ./start.sh
#
#   4. Seed the database (first time only — creates the admin account):
#        docker exec ampm-app node ./node_modules/prisma/build/index.js db seed
#
# Default admin credentials (set in prisma/seed.ts):
#   Email:    driex2002@gmail.com
#   Password: pass1234
# ============================================================
set -e

echo "Starting AMPM Lending System..."
docker compose up -d
echo ""
echo "Application is running at http://localhost:3000"
echo "PostgreSQL is available at localhost:5432"
echo ""
echo "FIRST TIME? Run the seed command to create the admin account:"
echo "  docker exec ampm-app node ./node_modules/prisma/build/index.js db seed"
echo ""
echo "Use ./stop.sh to shut down."
