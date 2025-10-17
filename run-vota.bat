@echo off
REM ========================================
REM Script Batch per l'avvio del bot di voto
REM ========================================
REM
REM Questo script facilita l'esecuzione di vota.js da Windows
REM permettendo di passare parametri opzionali via riga di comando
REM
REM USO:
REM   run-vota.bat                    -> Esegue con impostazioni da .env
REM   run-vota.bat false              -> Browser visibile
REM   run-vota.bat true               -> Browser nascosto (headless)
REM   run-vota.bat false true         -> Browser visibile + KEEP_OPEN attivo
REM
REM PARAMETRI:
REM   %1 = HEADLESS (true/false) - Modalità browser
REM   %2 = KEEP_OPEN (true/false) - Mantiene il browser aperto (opzionale)
REM
REM ========================================

REM Cambia directory alla cartella dello script (dove si trova questo .bat)
cd /d "%~dp0"

REM Inizia un contesto locale per le variabili d'ambiente
REM Le modifiche alle variabili non influenzeranno il sistema
setlocal

REM ----------------------------------------
REM Gestione parametri opzionali
REM ----------------------------------------

REM Se è stato passato il primo parametro, impostalo come HEADLESS
if not "%~1"=="" set HEADLESS=%~1

REM Se è stato passato il secondo parametro, impostalo come KEEP_OPEN
if not "%~2"=="" set KEEP_OPEN=%~2

REM ----------------------------------------
REM Esecuzione dello script Node.js
REM ----------------------------------------

echo ========================================
echo   Minecraft-Italia Auto-Vote Bot
echo ========================================
echo.
echo Avvio di vota.js in corso...
echo.

REM Esegue vota.js con Node.js
REM %~dp0 = percorso completo della directory di questo script
node "%~dp0vota.js"

REM ----------------------------------------
REM Pulizia e chiusura
REM ----------------------------------------

REM Termina il contesto locale delle variabili
endlocal

REM Pausa per permettere all'utente di leggere l'output
REM Premere un tasto qualsiasi per chiudere la finestra
echo.
pause
