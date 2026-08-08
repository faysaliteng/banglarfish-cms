# ============================================================================
# Banglarfish — run locally on Windows for testing.
# Starts a PostgreSQL database (via Docker) with the mock data, then runs the
# app. Open http://127.0.0.1:5177 when it says the server is ready.
#
# Usage: right-click -> Run with PowerShell, or run start-local.bat
# ============================================================================
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$Port  = 5177
$DbUrl = "postgres://banglarfish:banglarfish@127.0.0.1:5433/banglarfish"

Write-Host ">> Ensuring PostgreSQL (Docker container 'bf-local' on port 5433)..." -ForegroundColor Cyan
$exists = docker ps -a --filter "name=bf-local" --format "{{.Names}}"
if (-not $exists) {
  docker run -d --name bf-local -e POSTGRES_PASSWORD=banglarfish -e POSTGRES_USER=banglarfish -e POSTGRES_DB=banglarfish -p 5433:5432 postgres:16-alpine | Out-Null
} else {
  docker start bf-local | Out-Null
}
for ($i = 0; $i -lt 40; $i++) {
  docker exec bf-local pg_isready -U banglarfish 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep 1
}

$env:DATABASE_URL      = $DbUrl
$env:SMS_DEV_MODE      = "true"      # OTP codes print to this console instead of SMS
# Local seed admin. NEVER hardcode a password here — this file is in git.
# Set them in your shell before running, e.g.
#   $env:SEED_ADMIN_EMAIL="you@example.com"; $env:SEED_ADMIN_PASSWORD="…"
# If unset, a strong random password is generated and printed once below.
if (-not $env:SEED_ADMIN_EMAIL) { $env:SEED_ADMIN_EMAIL = "admin@banglarfish.com" }
if (-not $env:SEED_ADMIN_PASSWORD) {
  $bytes = New-Object 'System.Byte[]' 18
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $env:SEED_ADMIN_PASSWORD = [Convert]::ToBase64String($bytes)
  $script:GeneratedAdminPassword = $true
}

if (-not (Test-Path node_modules)) {
  Write-Host ">> Installing dependencies (first run)..." -ForegroundColor Cyan
  npm install
}

Write-Host ">> Applying migrations + seeding mock data (safe to re-run)..." -ForegroundColor Cyan
npx drizzle-kit migrate
npm run db:seed

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Banglarfish is starting at:  http://127.0.0.1:$Port/" -ForegroundColor Green
Write-Host "  Admin panel:  http://127.0.0.1:$Port/admin" -ForegroundColor Green
Write-Host "  Admin login:  $($env:SEED_ADMIN_EMAIL)" -ForegroundColor Green
if ($script:GeneratedAdminPassword) {
  Write-Host "  Admin password (generated, shown once): $($env:SEED_ADMIN_PASSWORD)" -ForegroundColor Yellow
} else {
  Write-Host "  Admin password: (from `$env:SEED_ADMIN_PASSWORD)" -ForegroundColor DarkGray
}
Write-Host "  (Signup OTP codes appear in THIS window while testing.)" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

Start-Process "http://127.0.0.1:$Port/"
npm run dev -- --port $Port --host 127.0.0.1
