# Sync Vercel Production + Preview env from local .env (canonical project ertdqfavrkomikszagtc)
# Requires: npx vercel login && npx vercel link (from project root)
# Usage: .\scripts\sync-vercel-env.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'

if (-not (Test-Path $envFile)) {
  Write-Host 'Missing .env — copy from .env.example and set VITE_SUPABASE_*'
  exit 1
}

$url = ''
$key = ''
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*VITE_SUPABASE_URL=(.+)$') { $url = $matches[1].Trim() }
  if ($_ -match '^\s*VITE_SUPABASE_ANON_KEY=(.+)$') { $key = $matches[1].Trim() }
}

if ($url -notmatch 'ertdqfavrkomikszagtc') {
  Write-Host '[FAIL] .env must use project ertdqfavrkomikszagtc'
  exit 1
}

$env:NODE_OPTIONS = '--use-system-ca'
Set-Location $root

foreach ($target in @('production', 'preview')) {
  Write-Host "`n=== $target ==="
  npx vercel env rm VITE_SUPABASE_URL $target --yes 2>$null
  npx vercel env rm VITE_SUPABASE_ANON_KEY $target --yes 2>$null
  $url | npx vercel env add VITE_SUPABASE_URL $target
  $key | npx vercel env add VITE_SUPABASE_ANON_KEY $target
}

Write-Host "`nDone. Redeploy: npx vercel --prod"
Write-Host "Verify: .\scripts\probe-vercel-bundle.ps1"
