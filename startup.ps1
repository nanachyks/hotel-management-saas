param(
  [switch]$NoSeed,
  [switch]$NoInstall
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "===== HotelEase - Startup Script =====" -ForegroundColor Cyan
Write-Host ""

if (-not $NoInstall) {
  Write-Host ">> Installing dependencies..." -ForegroundColor Yellow
  Push-Location -LiteralPath "$root\server"
  npm install
  if (-not $?) { Write-Host "Server install failed" -ForegroundColor Red; exit 1 }
  Pop-Location

  Push-Location -LiteralPath "$root\client"
  npm install
  if (-not $?) { Write-Host "Client install failed" -ForegroundColor Red; exit 1 }
  Pop-Location
}

$dbPath = "$root\server\data\hotel.db"
if (-not (Test-Path -LiteralPath $dbPath) -and -not $NoSeed) {
  Write-Host ">> No database found. Running seed..." -ForegroundColor Yellow
  Push-Location -LiteralPath "$root\server"
  npm run seed
  Pop-Location
} elseif (-not $NoSeed) {
  Write-Host ">> Database exists. Skipping seed." -ForegroundColor Green
}

Write-Host ""
Write-Host ">> Starting server (port 3001) and client (port 5173)..." -ForegroundColor Yellow
Write-Host ">> Press Ctrl+C to stop both" -ForegroundColor Cyan
Write-Host ""

& "$root\node_modules\.bin\concurrently" -n server,client -c cyan,green "cd $root\server && npm run dev" "cd $root\client && npm run dev"
