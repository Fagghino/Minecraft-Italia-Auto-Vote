<#
========================================
Script PowerShell per l'avvio del bot di voto
========================================

Questo script facilita l'esecuzione di vota.js da PowerShell
permettendo di passare parametri nominati e impostare variabili d'ambiente

USO:
  .\run-vota.ps1                           -> Esegue con impostazioni da .env
  .\run-vota.ps1 -HEADLESS false           -> Browser visibile
  .\run-vota.ps1 -HEADLESS true            -> Browser nascosto (headless)
  .\run-vota.ps1 -HEADLESS false -KEEP_OPEN true -> Browser visibile + KEEP_OPEN

PARAMETRI:
  -HEADLESS (string)  : Modalità browser (true/false)
  -KEEP_OPEN (string) : Mantiene il browser aperto dopo l'esecuzione (opzionale)

NOTE:
  - I parametri sovrascrivono temporaneamente i valori del file .env
  - Le variabili d'ambiente impostate sono solo per questa esecuzione

========================================
#>

# ----------------------------------------
# Definizione parametri dello script
# ----------------------------------------
param(
  [string]$HEADLESS = $null,   # Modalità browser (true=headless, false=visibile)
  [string]$KEEP_OPEN = $null   # Mantiene il browser aperto (opzionale)
)

# ----------------------------------------
# Impostazione della directory di lavoro
# ----------------------------------------
# Sposta la directory corrente alla cartella dove si trova questo script
# Questo assicura che i percorsi relativi funzionino correttamente
Push-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent)

# ----------------------------------------
# Configurazione variabili d'ambiente
# ----------------------------------------
# Se i parametri sono stati forniti, li imposta come variabili d'ambiente
# Queste variabili saranno lette da vota.js tramite process.env

if ($HEADLESS) { 
  $env:HEADLESS = $HEADLESS 
}

if ($KEEP_OPEN) { 
  $env:KEEP_OPEN = $KEEP_OPEN 
}

# ----------------------------------------
# Output informativo
# ----------------------------------------
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Minecraft-Italia Auto-Vote Bot" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Avvio vota.js in corso..." -ForegroundColor Green
Write-Host ""

# ----------------------------------------
# Esecuzione dello script Node.js
# ----------------------------------------
node .\vota.js

# ----------------------------------------
# Ripristino directory precedente
# ----------------------------------------
# Ritorna alla directory da cui è stato chiamato lo script
Pop-Location
