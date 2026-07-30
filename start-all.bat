@echo off
REM ═══════════════════════════════════════════════════════════════
REM Запуск всей платформы одной командой (Windows)
REM ═══════════════════════════════════════════════════════════════
cd /d "%~dp0"
start "OLAN сервер" cmd /k "cd server && npm start"
timeout /t 3 >nul
start "OLAN сайт" cmd /k "cd site-client && npm run dev"
start "OLAN кабинеты" cmd /k "cd portal-staff && npm run dev"
start "OLAN админка" cmd /k "cd admin-panel && npm run dev"
echo.
echo   Главный сайт   http://localhost:5173
echo   Кабинеты       http://localhost:5174
echo   Админ-панель   http://localhost:5175
echo.
pause
