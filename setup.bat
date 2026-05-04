@echo off
setlocal EnableDelayedExpansion
:: =============================================================================
:: AMPM Lending -- First-Time Setup Script (Windows CMD)
:: =============================================================================
:: Prerequisites (must be installed before running this script):
::   - Docker Desktop (includes Compose V2)
::   - PowerShell 5.1 or later (built into Windows 10+)
::
:: Usage (first time on a fresh clone):
::   Double-click setup.bat  OR  run from Command Prompt / PowerShell terminal
::   (Right-click -> "Run as administrator" is NOT required)
::
::   If you prefer Git Bash, run setup.sh instead -- it does the same thing.
::
:: What this script does:
::   1. Creates .env from .env.example (skips if .env already exists)
::   2. Auto-generates and writes NEXTAUTH_SECRET into .env via PowerShell
::   3. Builds the Docker image and starts all containers
::   4. Waits for the database and app to be healthy
::   5. Seeds the database (admin account, loan terms, settings)
:: =============================================================================

echo.
echo ============================================================
echo   AMPM Lending -- First-Time Setup (Windows)
echo ============================================================
echo.

:: ── Guard: Docker must be running ───────────────────────────────────────────
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Start Docker Desktop and try again.
    pause
    exit /b 1
)

:: ── Step 1: Create .env ──────────────────────────────────────────────────────
echo [1/5] Preparing environment file...
if exist .env (
    echo       .env already exists -- skipping copy. Delete it to reset from scratch.
) else (
    copy .env.example .env > nul
    echo       Created .env from .env.example.
)

:: ── Step 2: Generate NEXTAUTH_SECRET ────────────────────────────────────────
echo [2/5] Configuring NEXTAUTH_SECRET...

:: Check whether the placeholder value is still present in .env
findstr /C:"NEXTAUTH_SECRET=\"replace_with_your_generated_secret\"" .env > nul 2>&1
if %errorlevel% == 0 (
    echo       Generating secret via PowerShell...

    :: Write a temporary PowerShell script to avoid inline quoting nightmares.
    :: RandomNumberGenerator.GetBytes(32) -> base64 -> replace placeholder in .env
    (
        echo $secret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32^)^)
        echo $content = Get-Content '.env' -Raw
        echo $content = $content -replace 'NEXTAUTH_SECRET="replace_with_your_generated_secret"', ('NEXTAUTH_SECRET="' + $secret + '"'^)
        echo Set-Content '.env' $content -NoNewline
    ) > "%TEMP%\ampm_gen_secret.ps1"

    powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\ampm_gen_secret.ps1"
    del "%TEMP%\ampm_gen_secret.ps1" > nul 2>&1

    echo       NEXTAUTH_SECRET generated and saved to .env.
) else (
    echo       NEXTAUTH_SECRET is already set -- skipping.
)

:: ── Step 3: Build image and start containers ─────────────────────────────────
echo [3/5] Building Docker image and starting containers...
echo       (First run takes a few minutes -- npm install + Next.js compile)
docker compose up -d --build
if %errorlevel% neq 0 (
    echo ERROR: docker compose failed. Check the output above.
    pause
    exit /b 1
)

:: ── Step 4: Wait for containers to be healthy ────────────────────────────────
echo [4/5] Waiting for containers to be healthy...

:: 4a. Wait for Postgres healthcheck
echo|set /p ="      PostgreSQL"
:wait_postgres
for /f "usebackq tokens=*" %%H in (`docker inspect --format "{{.State.Health.Status}}" ampm-postgres 2^>nul`) do set PG_HEALTH=%%H
if not "!PG_HEALTH!" == "healthy" (
    echo|set /p ="."
    timeout /t 2 /nobreak > nul
    goto wait_postgres
)
echo  OK

:: 4b. Wait for the app container to be running (not restarting)
echo|set /p ="      Next.js app"
set RETRIES=40
:wait_app
for /f "usebackq tokens=*" %%S in (`docker inspect --format "{{.State.Status}}" ampm-app 2^>nul`) do set APP_STATUS=%%S
if not "!APP_STATUS!" == "running" (
    set /a RETRIES-=1
    if !RETRIES! leq 0 (
        echo.
        echo ERROR: ampm-app failed to start. Check logs: docker logs ampm-app
        pause
        exit /b 1
    )
    echo|set /p ="."
    timeout /t 3 /nobreak > nul
    goto wait_app
)
echo  OK

:: 4c. Give Next.js a moment to finish startup (migrations run before server starts)
::     A fixed wait is used here because parsing docker logs in batch is fragile.
echo       Giving Next.js 10 seconds to finish startup...
timeout /t 10 /nobreak > nul
echo       Ready.

:: ── Step 5: Seed the database ────────────────────────────────────────────────
echo [5/5] Seeding the database (admin account, loan terms, interest configs, settings)...
:: prisma db seed reads package.json -> runs: tsx prisma/seed.ts
:: tsx is bundled inside the container (see Dockerfile).
docker exec ampm-app node ./node_modules/prisma/build/index.js db seed

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
echo ============================================================
echo   Setup complete!
echo.
echo   Application:    http://localhost:3000
echo.
echo   Sign in using Google OAuth with driex2002@gmail.com
echo   (First login auto-provisions the super admin account)
echo.
echo   Useful commands:
echo     Start:    start.bat
echo     Stop:     stop.bat
echo     Logs:     docker logs ampm-app -f
echo ============================================================
echo.
pause
