# Set Vercel env vars via REST API (no interactive CLI login).
# Prerequisite: create token at https://vercel.com/account/tokens
#   $env:VERCEL_TOKEN = 'your_token'
# Optional: $env:VERCEL_PROJECT_ID = 'prj_...' (else auto-detect hm-houticars)
#
# Usage: .\scripts\set-vercel-env-api.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'

if (-not $env:VERCEL_TOKEN) {
  Write-Host '[FAIL] Set VERCEL_TOKEN (https://vercel.com/account/tokens)'
  exit 1
}

$url = ''
$key = ''
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*VITE_SUPABASE_URL=(.+)$') { $url = $matches[1].Trim() }
  if ($_ -match '^\s*VITE_SUPABASE_ANON_KEY=(.+)$') { $key = $matches[1].Trim() }
}

if ($url -notmatch 'ertdqfavrkomikszagtc') {
  Write-Host '[FAIL] .env must target ertdqfavrkomikszagtc'
  exit 1
}

$headers = @{
  Authorization = "Bearer $env:VERCEL_TOKEN"
  'Content-Type' = 'application/json'
}

$projectId = $env:VERCEL_PROJECT_ID
if (-not $projectId) {
  $projects = Invoke-RestMethod -Uri 'https://api.vercel.com/v9/projects?search=hm-houticars' -Headers $headers
  $projectId = ($projects.projects | Where-Object { $_.name -match 'houti' } | Select-Object -First 1).id
  if (-not $projectId) {
    Write-Host '[FAIL] Could not find project. Set VERCEL_PROJECT_ID=prj_...'
    exit 1
  }
}

Write-Host "Project: $projectId"

function Remove-EnvVar($name, $target) {
  try {
    Invoke-RestMethod -Method Delete -Uri "https://api.vercel.com/v9/projects/$projectId/env?key=$name&target=$target" -Headers $headers | Out-Null
  } catch { }
}

function Add-EnvVar($name, $value, $target) {
  $body = @{
    key = $name
    value = $value
    type = 'encrypted'
    target = @($target)
  } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v10/projects/$projectId/env" -Headers $headers -Body $body | Out-Null
}

foreach ($target in @('production', 'preview')) {
  Write-Host "Updating $target..."
  Remove-EnvVar 'VITE_SUPABASE_URL' $target
  Remove-EnvVar 'VITE_SUPABASE_ANON_KEY' $target
  Add-EnvVar 'VITE_SUPABASE_URL' $url $target
  Add-EnvVar 'VITE_SUPABASE_ANON_KEY' $key $target
}

Write-Host '[OK] Env vars set. Triggering production deploy (no cache)...'

$deployBody = @{
  name = 'hm-houticars'
  target = 'production'
  gitSource = @{ type = 'github' }
} | ConvertTo-Json -Depth 5

try {
  $dep = Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v13/deployments" -Headers $headers -Body $deployBody
  Write-Host "Deploy URL: https://$($dep.url)"
} catch {
  Write-Host 'Env updated. Redeploy manually: Vercel Dashboard -> Deployments -> Redeploy (uncheck build cache)'
  Write-Host $_.ErrorDetails.Message
}

Write-Host 'Verify: npm run probe:vercel'
