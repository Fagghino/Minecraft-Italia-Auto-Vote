@echo off
REM Esegue lo script Node che legge variabili da .env
REM Uso: run-vota.bat [HEADLESS] [KEEP_OPEN]
REM Esempio: run-vota.bat false true

cd /d "%~dp0"
setlocal

if not "%~1"=="" set HEADLESS=%~1
if not "%~2"=="" set KEEP_OPEN=%~2

echo Avvio `vota.js` con:
echo   HEADLESS=%HEADLESS%
echo   KEEP_OPEN=%KEEP_OPEN%

node "%~dp0vota.js"

endlocal
pause
