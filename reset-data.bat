@echo off
REM ============================================================
REM AMPM Lending — Reset test data (keeps user accounts)
REM Clears: loans, payment_schedules, payments, audit_logs,
REM         notifications
REM Usage: reset-data.bat
REM ============================================================

echo Resetting AMPM Lending test data...
echo (User accounts will be preserved)
echo.

docker exec ampm-postgres psql -U ampm -d ampm_lending -c "DELETE FROM audit_logs; DELETE FROM notifications; DELETE FROM payments; DELETE FROM payment_schedules; DELETE FROM loans; SELECT 'audit_logs' AS table_name, COUNT(*) AS remaining FROM audit_logs UNION ALL SELECT 'notifications', COUNT(*) FROM notifications UNION ALL SELECT 'payments', COUNT(*) FROM payments UNION ALL SELECT 'payment_schedules', COUNT(*) FROM payment_schedules UNION ALL SELECT 'loans', COUNT(*) FROM loans;"

echo.
echo Done. All test data cleared - users are untouched.
