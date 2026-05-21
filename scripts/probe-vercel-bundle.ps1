# Probe a deployed Vercel site for baked-in Supabase project ref.
# Usage: .\scripts\probe-vercel-bundle.ps1 -SiteUrl https://hm-houticars.vercel.app

param(
  [string]$SiteUrl = 'https://hm-houticars.vercel.app',
  [string]$ExpectedRef = 'ertdqfavrkomikszagtc'
)

$ErrorActionPreference = 'Stop'
$html = (Invoke-WebRequest -Uri $SiteUrl -UseBasicParsing).Content
$asset = [regex]::Match($html, 'assets/supabase-[^"]+\.js').Value
if (-not $asset) { Write-Host "[FAIL] No supabase chunk in index.html"; exit 1 }

$js = (Invoke-WebRequest -Uri "$SiteUrl/$asset" -UseBasicParsing).Content
$found = [regex]::Match($js, 'https://([a-z0-9]+)\.supabase\.co')
if (-not $found.Success) { Write-Host "[FAIL] No supabase URL in bundle"; exit 1 }

$ref = $found.Groups[1].Value
if ($ref -eq $ExpectedRef) {
  Write-Host "[PASS] Production bundle uses $ref"
  exit 0
}

Write-Host "[FAIL] Production uses $ref - expected $ExpectedRef"
Write-Host "Fix: Vercel env vars + redeploy (see docs/VERCEL_ENV_SYNC.md)"
exit 1
