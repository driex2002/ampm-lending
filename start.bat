@echo off
REM ============================================================
REM AMPM Lending — Quick-start script (Windows)
REM ============================================================
REM FIRST-TIME SETUP (run these steps once before using this script):
REM
REM   1. Copy environment file:
REM        copy .env.example .env
REM
REM   2. Set a secret in .env — open it and replace NEXTAUTH_SECRET value.
REM      Generate one with PowerShell:
REM        [Convert]::ToBase64String((1..32 | %% { Get-Random -Max 256 }))
REM
REM   3. Start containers:
REM        start.bat
REM
REM   4. Seed the database (first time only — creates the admin account):
REM        docker exec ampm-app node ./node_modules/prisma/build/index.js db seed
REM
REM Default admin credentials (set in prisma/seed.ts):
REM   Email:    admin@ampmlending.com
REM   Password: Admin@AMPM2024!
REM ============================================================

echo Starting AMPM Lending System...
docker compose up -d
echo.
echo Application is running at http://localhost:3000
echo PostgreSQL is available at localhost:5432
echo.
echo FIRST TIME? Run the seed command to create the admin account:
echo   docker exec ampm-app node ./node_modules/prisma/build/index.js db seed
echo.
echo Use stop.bat to shut down.
