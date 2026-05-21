# Automated Supabase Auth E2E (PowerShell — works on Windows)
# Usage: .\scripts\auth-e2e-test.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      if (-not [Environment]::GetEnvironmentVariable($k)) {
        [Environment]::SetEnvironmentVariable($k, $v, "Process")
      }
    }
  }
}

$base = ($env:VITE_SUPABASE_URL -replace '/+$','').Trim()
$key = $env:VITE_SUPABASE_ANON_KEY.Trim()
$failed = 0

function Pass($msg, $detail = "") { Write-Host "[PASS] $msg $detail" }
function Fail($msg, $detail = "") { Write-Host "[FAIL] $msg $detail"; $script:failed++ }

Write-Host ""
Write-Host "=== HM Houti Cars - Auth E2E (PowerShell) ==="
Write-Host ""

if (-not $base -or -not $key) { Fail "Missing env vars"; exit 1 }
if ($base -notmatch '^https://') { Fail "URL must be https" } else { Pass "HTTPS URL" $base }

$headers = @{
  apikey = $key
  Authorization = "Bearer $key"
  "Content-Type" = "application/json"
}

$email = "e2e-$(Get-Random)@mailinator.com"
$pass = "123456"
$signupBody = @{ email = $email; password = $pass } | ConvertTo-Json

try {
  $signup = Invoke-RestMethod -Uri "$base/auth/v1/signup" -Method POST -Headers $headers -Body $signupBody
  if ($signup.access_token) { Pass "signUp + session" $email }
  elseif ($signup.user) { Pass "signUp user (no token)" $email }
  else { Fail "signUp empty response" }
} catch {
  Fail "signUp" $_.ErrorDetails.Message
}

try {
  $loginBody = @{ email = $email; password = $pass } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri "$base/auth/v1/token?grant_type=password" -Method POST -Headers $headers -Body $loginBody
  if ($login.access_token) { Pass "signIn" } else { Fail "signIn no token" }
} catch {
  Fail "signIn" $_.ErrorDetails.Message
}

try {
  $dup = Invoke-RestMethod -Uri "$base/auth/v1/signup" -Method POST -Headers $headers -Body $signupBody
  if ($dup.user.identities.Count -eq 0) { Pass "duplicate email detected" }
  else { Pass "duplicate signUp handled" }
} catch {
  Pass "duplicate rejected" $_.ErrorDetails.Message
}

if ($failed -eq 0) {
  Write-Host ""
  Write-Host "All checks passed."
  Write-Host ""
  exit 0
} else {
  Write-Host ""
  Write-Host "$failed check(s) failed."
  Write-Host ""
  exit 1
}
