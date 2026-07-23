param(
  [switch]$NoSeed,
  [switch]$NoInstall
)

$root = (Get-Item -LiteralPath ".\server").FullName

Write-Host "===== HotelEase - Startup Script =====" -ForegroundColor Cyan
Write-Host ""

if (-not $NoInstall) {
  Write-Host ">> Installing server dependencies..." -ForegroundColor Yellow
  Push-Location -LiteralPath "server"
  npm install
  if (-not $?) { Write-Host "Server install failed" -ForegroundColor Red; exit 1 }
  Pop-Location

  Write-Host ">> Installing client dependencies..." -ForegroundColor Yellow
  Push-Location -LiteralPath "client"
  npm install
  if (-not $?) { Write-Host "Client install failed" -ForegroundColor Red; exit 1 }
  Pop-Location
}

$dbPath = Join-Path $root "data" "hotel.db"
if (-not (Test-Path -LiteralPath $dbPath) -and -not $NoSeed) {
  Write-Host ">> No database found. Running seed..." -ForegroundColor Yellow
  Push-Location -LiteralPath "server"
  npm run seed
  Pop-Location
} elseif (-not $NoSeed) {
  Write-Host ">> Database exists. Skipping seed." -ForegroundColor Green
}

Write-Host ""
Write-Host ">> Starting server (port 3001)..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock {
  Set-Location -LiteralPath $args[0]
  npm run dev
} -ArgumentList $root

Push-Location -LiteralPath "client"
$clientRoot = (Get-Item -LiteralPath ".").FullName
Pop-Location

Write-Host ">> Starting client (port 5173)..." -ForegroundColor Yellow
$clientJob = Start-Job -ScriptBlock {
  Set-Location -LiteralPath $args[0]
  npm run dev
} -ArgumentList $clientRoot

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "OK Server running at http://localhost:3001" -ForegroundColor Green
Write-Host "OK Client running at http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Cyan

try {
  while ($true) { Start-Sleep -Seconds 1 }
} finally {
  Stop-Job $serverJob -ErrorAction SilentlyContinue
  Remove-Job $serverJob -ErrorAction SilentlyContinue
  Stop-Job $clientJob -ErrorAction SilentlyContinue
  Remove-Job $clientJob -ErrorAction SilentlyContinue
}
