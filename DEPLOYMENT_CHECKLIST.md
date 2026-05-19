# 📋 Deployment Checklist — HoutiCars Booking System

**Last Updated:** May 18, 2026  
**Status:** Ready for Deployment

---

## Pre-Deployment ✓

- [ ] Supabase project created at https://supabase.com
- [ ] Have your project reference (Settings > General > Project Ref)
- [ ] Supabase CLI installed: `npm install -g supabase`
- [ ] Read **QUICK_START.md** and **EDGE_FUNCTIONS_GUIDE.md**

---

## Deployment Steps

### 1️⃣ Authenticate with Supabase
```bash
supabase login
```
- [ ] Authentication successful
- [ ] Can list projects: `supabase projects list`

### 2️⃣ Link Your Project
```bash
cd supabase
supabase link --project-ref <your-project-ref>
```
- [ ] Project linked successfully
- [ ] Status: `supabase status`

### 3️⃣ Deploy Edge Functions
```bash
supabase functions deploy
```
Or run the automated script:
- **macOS/Linux**: `bash deploy.sh <your-project-ref>`
- **Windows**: `deploy.bat <your-project-ref>`

- [ ] validate-reservation deployed
- [ ] confirm-reservation deployed
- [ ] generate-contract deployed
- [ ] Verified with: `supabase functions list`

### 4️⃣ Setup Database Schema
Navigate to **Supabase Dashboard > SQL Editor** and:

1. Click **New Query**
2. Copy entire contents of: `supabase/migrations/20240518_booking_system.sql`
3. Paste into the editor
4. Click **Run** button
5. Verify success (no errors shown)

- [ ] Tables created: bookings, contracts
- [ ] Indexes created
- [ ] Functions created
- [ ] RLS policies enabled
- [ ] Triggers configured

**Alternative:** Use CLI
```bash
supabase db push
```

### 5️⃣ Configure Environment Secrets
Go to **Supabase Dashboard > Edge Functions > Secrets** and add:

```
SUPABASE_URL
Value: https://your-project.supabase.co
```

```
SUPABASE_SERVICE_ROLE_KEY
Value: <Get from: Supabase Dashboard > Settings > API > Service Role Key>
```

- [ ] SUPABASE_URL set
- [ ] SUPABASE_SERVICE_ROLE_KEY set

### 6️⃣ Verify Functions are Working
Test each function:

**Option A: Using Supabase Dashboard**
1. Go to **Edge Functions** page
2. Click on each function name
3. Look at recent "Invocations" log

**Option B: Using CLI**
```bash
# View logs in real-time
supabase functions logs validate-reservation --tail
supabase functions logs confirm-reservation --tail
supabase functions logs generate-contract --tail
```

**Option C: Using curl**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/validate-reservation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "car_id": "test-uuid",
    "user_id": "test-uuid",
    "start_date": "2024-06-01T10:00:00Z",
    "end_date": "2024-06-05T10:00:00Z",
    "pickup_location": "Airport",
    "dropoff_location": "Downtown"
  }'
```

- [ ] validate-reservation responds
- [ ] confirm-reservation responds
- [ ] generate-contract responds
- [ ] No 401/403 errors in logs

---

## React Frontend Integration

### 7️⃣ Add Booking Service to Components
```typescript
import {
  validateReservation,
  confirmReservation,
  generateContract,
  completeBooking,
} from './services/booking.service'
```

- [ ] Import successful
- [ ] No TypeScript errors
- [ ] Service methods available

### 8️⃣ Integrate Example Component
```typescript
import BookingExample from './components/BookingExample'

export default function Page() {
  return (
    <BookingExample 
      car={carData} 
      currentUser={currentUser} 
    />
  )
}
```

- [ ] Component imports without errors
- [ ] Props passed correctly
- [ ] Renders without issues

### 9️⃣ Test Full Booking Flow
1. Load booking component
2. Fill in all fields:
   - Start date: Any future date
   - End date: 3+ days later
   - Locations: Test values
   - Insurance: Try both yes/no
3. Click "Check Availability"
4. Review pricing calculation
5. Confirm booking
6. Verify contract URL generated
7. Download contract (should be HTML)

- [ ] Validation works correctly
- [ ] Pricing calculations accurate
- [ ] Booking confirmation successful
- [ ] Contract generates with correct data
- [ ] Contract downloadable

---

## Post-Deployment Verification

### 🔍 Database Checks
Run these queries in **Supabase SQL Editor**:

```sql
-- Check tables exist
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bookings', 'contracts');

-- Check bookings table structure
\d bookings

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('bookings', 'contracts');
```

- [ ] bookings table exists with all columns
- [ ] contracts table exists with all columns
- [ ] RLS enabled on both tables
- [ ] Indexes created
- [ ] Triggers functional

### 📊 Functions Health Check
```bash
# Get function details
supabase functions list

# View recent invocations
supabase functions logs validate-reservation
supabase functions logs confirm-reservation
supabase functions logs generate-contract

# Check for errors
# (No 500 errors should appear)
```

- [ ] All 3 functions deployed
- [ ] No persistent errors in logs
- [ ] Response times reasonable (< 1s)

### 🔐 Security Check
- [ ] JWT validation enabled in functions
- [ ] CORS headers configured
- [ ] RLS policies active
- [ ] Service role key protected
- [ ] Environment variables secured

---

## Environment & Configuration

### ✅ Required Environment Variables
In your React project `.env` (already configured):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] Variables set
- [ ] Values correct
- [ ] `.env` not committed to git

### ✅ Supabase Dashboard Settings
- [ ] Edge Functions page accessible
- [ ] Can view function logs
- [ ] Secrets properly configured
- [ ] Database queries working

---

## Rollback & Recovery

If issues occur:

### Revert Functions
```bash
# Redeploy all functions
supabase functions deploy

# Or specific function
supabase functions deploy validate-reservation
```

### Check Previous Deployments
```bash
supabase functions list
# Shows deployment history
```

### View Error Logs
```bash
supabase functions logs <name> --tail
# Shows real-time error logs
```

### Database Rollback
Supabase keeps automatic backups. In SQL Editor:
```sql
-- Can manually run old migrations or reset tables
DELETE FROM bookings;  -- Clear test data
DELETE FROM contracts;
```

---

## Troubleshooting

### Functions Not Responding
```bash
# Check deployment
supabase functions list

# Redeploy
supabase functions deploy validate-reservation

# Check logs
supabase functions logs validate-reservation --tail

# Verify secrets are set
# Supabase Dashboard > Edge Functions > Secrets
```

### JWT Errors (401)
```bash
# Ensure verify_jwt = true in config.toml
# Functions auto-verify JWT from Authorization header
# Check: Authorization: Bearer <your-jwt-token>
```

### Database Connection Issues
```bash
# Restart local database
supabase db start

# Or check service role key:
# Supabase Dashboard > Settings > API > Service Role
```

### CORS Errors
- Functions already include CORS headers
- Check browser DevTools Network tab for actual error
- Error might be from frontend, not functions

---

## Performance Optimization

### Optional: Enable Caching
In `.env`:
```
SUPABASE_CACHE_TTL=300  # 5 minutes
```

### Optional: Rate Limiting
In `supabase/config.toml`:
```toml
[functions]
rate_limit = "1000/minute"
```

### Monitoring
- [ ] Monitor function invocations in Dashboard
- [ ] Track database query performance
- [ ] Check Edge Functions metrics

---

## Going Live Checklist

Before going to production:

- [ ] All 3 functions deployed
- [ ] Database fully migrated
- [ ] React components integrated
- [ ] Booking flow tested end-to-end
- [ ] Contracts generating correctly
- [ ] Email integration ready (optional)
- [ ] Error monitoring configured
- [ ] Backups enabled
- [ ] SSL/HTTPS configured
- [ ] Documentation updated

---

## Maintenance

### Daily
- [ ] Monitor function logs for errors
- [ ] Check database backups

### Weekly
- [ ] Review booking metrics
- [ ] Check for failed transactions
- [ ] Monitor storage usage

### Monthly
- [ ] Update dependencies
- [ ] Review security policies
- [ ] Check Supabase status page
- [ ] Backup critical data

---

## Support Resources

| Resource | Purpose |
|----------|---------|
| [QUICK_START.md](./QUICK_START.md) | 5-minute setup |
| [EDGE_FUNCTIONS_GUIDE.md](./EDGE_FUNCTIONS_GUIDE.md) | Comprehensive guide |
| [Supabase Docs](https://supabase.com/docs) | Official documentation |
| [Deno Docs](https://deno.land/manual) | Deno runtime info |
| Dashboard Logs | Real-time errors |

---

## Sign-Off

**Deployment Manager:** _________________  
**Date:** _________________  
**Status:** ✅ Ready for Production

---

**Last Updated:** May 18, 2026  
**Version:** 1.0.0
