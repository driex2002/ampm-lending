@echo off
REM ============================================================
REM AMPM Lending — Rebuild script (Windows)
REM Stops containers, rebuilds images, and restarts everything.
REM
REM Usage:
REM   rebuild.bat                – rebuild normally
REM   rebuild.bat --clear-cache  – rebuild without Docker layer cache
REM ============================================================

SET NO_CACHE=

IF "%1"=="--clear-cache" (
  SET NO_CACHE=--no-cache
  echo Rebuilding with cleared cache...
) ELSE (
  echo Rebuilding normally...
)

echo Stopping AMPM Lending System...
docker compose down

echo.
echo Rebuilding and starting AMPM Lending System...
docker compose build %NO_CACHE% && docker compose up -d

echo.
echo Application is running at http://localhost:3000
echo PostgreSQL is available at localhost:5432
echo.
echo Use stop.bat to shut down.
