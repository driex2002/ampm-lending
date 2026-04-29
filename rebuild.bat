@echo off
REM ============================================================
REM AMPM Lending — Rebuild script (Windows)
REM Stops containers, rebuilds images, and restarts everything.
REM Usage: rebuild.bat
REM ============================================================

echo Stopping AMPM Lending System...
docker compose down

echo.
echo Rebuilding and starting AMPM Lending System...
docker compose up -d --build

echo.
echo Application is running at http://localhost:3000
echo PostgreSQL is available at localhost:5432
echo.
echo Use stop.bat to shut down.
