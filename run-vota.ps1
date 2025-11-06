<#
========================================
Minecraft-Italia Auto-Vote Bot
========================================
USO:
  .\run-vota.ps1                -> Usa impostazioni da .env
  .\run-vota.ps1 -HEADLESS false -> Browser visibile
  .\run-vota.ps1 -HEADLESS true  -> Browser nascosto
========================================
#>

param(
  [string]$HEADLESS = $null
)

Push-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent)

if ($HEADLESS) { 
  $env:HEADLESS = $HEADLESS 
}

node .\vota.js

Pop-Location
