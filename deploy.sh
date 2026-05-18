#!/bin/bash

# ============================================================
# HoutiCars Booking System - Deployment Script
# Usage: bash deploy.sh <project-ref>
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if project ref provided
if [ -z "$1" ]; then
    print_error "Project reference required"
    echo "Usage: bash deploy.sh <your-project-ref>"
    echo ""
    echo "Get your project ref from:"
    echo "  Supabase Dashboard > Settings > General > Project Ref"
    exit 1
fi

PROJECT_REF=$1

echo ""
echo "=========================================="
echo "HoutiCars Booking System - Deploy Script"
echo "=========================================="
echo ""

# Step 1: Check CLI
echo "📋 Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found"
    echo "Install with: npm install -g supabase"
    exit 1
fi
print_step "Supabase CLI installed"

# Step 2: Check login
echo ""
echo "🔐 Checking authentication..."
if ! supabase projects list &> /dev/null; then
    print_warning "Not authenticated with Supabase"
    echo "Running: supabase login"
    supabase login
fi
print_step "Authenticated with Supabase"

# Step 3: Link project
echo ""
echo "🔗 Linking to project: $PROJECT_REF"
cd supabase
supabase link --project-ref "$PROJECT_REF" || print_warning "Project already linked"
print_step "Project linked"

# Step 4: Deploy functions
echo ""
echo "🚀 Deploying Edge Functions..."
supabase functions deploy validate-reservation || print_error "Failed to deploy validate-reservation"
print_step "validate-reservation deployed"

supabase functions deploy confirm-reservation || print_error "Failed to deploy confirm-reservation"
print_step "confirm-reservation deployed"

supabase functions deploy generate-contract || print_error "Failed to deploy generate-contract"
print_step "generate-contract deployed"

# Step 5: List functions
echo ""
echo "📊 Deployed Functions:"
supabase functions list

# Step 6: Next steps
echo ""
echo "=========================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Set Environment Secrets:"
echo "   Go to: Supabase Dashboard > Edge Functions > Secrets"
echo "   Add:"
echo "     SUPABASE_URL = https://${PROJECT_REF}.supabase.co"
echo "     SUPABASE_SERVICE_ROLE_KEY = <your-service-role-key>"
echo ""
echo "2. Run Database Migration:"
echo "   Go to: Supabase Dashboard > SQL Editor"
echo "   Copy & paste contents of: supabase/migrations/20240518_booking_system.sql"
echo "   Click Run"
echo ""
echo "3. Test Functions:"
echo "   View logs with: supabase functions logs <name> --tail"
echo ""
echo "4. Integration:"
echo "   Use: src/services/booking.service.ts in your React components"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: QUICK_START.md"
echo "   - Full Guide: EDGE_FUNCTIONS_GUIDE.md"
echo ""
echo "Need help?"
echo "   - Check EDGE_FUNCTIONS_GUIDE.md Troubleshooting section"
echo "   - View function logs: supabase functions logs <name> --tail"
echo ""
