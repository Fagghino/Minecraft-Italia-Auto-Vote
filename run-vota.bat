@echo off
REM ========================================
REM Minecraft-Italia Auto-Vote Bot
REM ========================================
REM USO:
REM   run-vota.bat        -> Usa impostazioni da .env
REM   run-vota.bat false  -> Browser visibile
REM   run-vota.bat true   -> Browser nascosto
REM ========================================

cd /d "%~dp0"
setlocal

if not "%~1"=="" set HEADLESS=%~1

node "%~dp0vota.js"

endlocal
echo.
pause
