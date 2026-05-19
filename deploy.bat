@echo off
REM ============================================================
REM HoutiCars Booking System - Deployment Script (Windows)
REM Usage: deploy.bat <project-ref>
REM ============================================================

setlocal enabledelayedexpansion

if "%1"=="" (
    echo [ERROR] Project reference required
    echo.
    echo Usage: deploy.bat ^<your-project-ref^>
    echo.
    echo Get your project ref from:
    echo   Supabase Dashboard ^> Settings ^> General ^> Project Ref
    exit /b 1
)

set PROJECT_REF=%1

echo.
echo ==========================================
echo HoutiCars Booking System - Deploy Script
echo ==========================================
echo.

REM Step 1: Check CLI
echo [1/5] Checking Supabase CLI...
supabase --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Supabase CLI not found
    echo Install with: npm install -g supabase
    exit /b 1
)
echo [OK] Supabase CLI installed

REM Step 2: Check login
echo.
echo [2/5] Checking authentication...
supabase projects list >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Not authenticated with Supabase
    echo Running: supabase login
    call supabase login
)
echo [OK] Authenticated with Supabase

REM Step 3: Link project
echo.
echo [3/5] Linking to project: %PROJECT_REF%
cd supabase
call supabase link --project-ref %PROJECT_REF%
echo [OK] Project linked

REM Step 4: Deploy functions
echo.
echo [4/5] Deploying Edge Functions...
call supabase functions deploy validate-reservation
echo [OK] validate-reservation deployed

call supabase functions deploy confirm-reservation
echo [OK] confirm-reservation deployed

call supabase functions deploy generate-contract
echo [OK] generate-contract deployed

REM Step 5: List functions
echo.
echo [5/5] Deployed Functions:
call supabase functions list

REM Next steps
echo.
echo ==========================================
echo [SUCCESS] Deployment Complete!
echo ==========================================
echo.
echo Next Steps:
echo.
echo 1. Set Environment Secrets:
echo    Go to: Supabase Dashboard ^> Edge Functions ^> Secrets
echo    Add:
echo      SUPABASE_URL = https://%PROJECT_REF%.supabase.co
echo      SUPABASE_SERVICE_ROLE_KEY = ^<your-service-role-key^>
echo.
echo 2. Run Database Migration:
echo    Go to: Supabase Dashboard ^> SQL Editor
echo    Copy ^& paste contents of: supabase\migrations\20240518_booking_system.sql
echo    Click Run
echo.
echo 3. Test Functions:
echo    View logs with: supabase functions logs ^<name^> --tail
echo.
echo 4. Integration:
echo    Use: src\services\booking.service.ts in your React components
echo.
echo Documentation:
echo    - Quick Start: QUICK_START.md
echo    - Full Guide: EDGE_FUNCTIONS_GUIDE.md
echo.
echo Need help?
echo    - Check EDGE_FUNCTIONS_GUIDE.md Troubleshooting section
echo    - View function logs: supabase functions logs ^<name^> --tail
echo.

endlocal
