# One-time: upload staging env values to GitHub Actions secrets.
# Requires: gh CLI logged in with admin on tribly-tech/Project-Fineset
#   winget install GitHub.cli
#   gh auth login
#
# Reads .env.staging.local + GEMINI_API_KEY from .env.local.db (never committed).

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Read-DotEnv([string]$path) {
  $out = @{}
  if (-not (Test-Path $path)) { throw "Missing $path" }
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    $out[$key] = $val
  }
  return $out
}

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Host "Install GitHub CLI: winget install GitHub.cli"
  Write-Host "Then: gh auth login"
  exit 1
}

$staging = Read-DotEnv ".env.staging.local"
$localDb = Read-DotEnv ".env.local.db"

$map = @{
  STAGING_DATABASE_URL                  = $staging.DATABASE_URL
  STAGING_DIRECT_URL                    = $staging.DIRECT_URL
  STAGING_NEXT_PUBLIC_SUPABASE_URL      = $staging.NEXT_PUBLIC_SUPABASE_URL
  STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY = $staging.NEXT_PUBLIC_SUPABASE_ANON_KEY
  STAGING_SUPABASE_SERVICE_ROLE_KEY     = $staging.SUPABASE_SERVICE_ROLE_KEY
  STAGING_ENCRYPTION_KEY                = $staging.ENCRYPTION_KEY
  STAGING_GEMINI_API_KEY                = $localDb.GEMINI_API_KEY
}

foreach ($key in $map.Keys) {
  $val = $map[$key]
  if (-not $val) { throw "Empty value for $key" }
  if ($val -match "mfqpccrzfrptpiclafzu") { throw "$key looks like production — aborting" }
  Write-Host "Setting GitHub secret $key ..."
  $val | gh secret set $key --repo tribly-tech/Project-Fineset
}

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1. GitHub -> Actions -> Sync Staging Preview Env -> Run workflow"
Write-Host "  2. GitHub -> Actions -> Vercel Staging Deployment -> Re-run"
Write-Host "  3. Open https://fineset.staging.tribly.ai/api/auth/config-check"
