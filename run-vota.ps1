param(
  [string]$HEADLESS = $null,
  [string]$KEEP_OPEN = $null
)

Push-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent)

if ($HEADLESS) { $env:HEADLESS = $HEADLESS }
if ($KEEP_OPEN) { $env:KEEP_OPEN = $KEEP_OPEN }

Write-Host "Avvio vota.js con HEADLESS=$($env:HEADLESS) KEEP_OPEN=$($env:KEEP_OPEN)"

node .\vota.js

Pop-Location
