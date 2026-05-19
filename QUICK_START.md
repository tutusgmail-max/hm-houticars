# 🚀 HoutiCars Booking System - Quick Start Guide

## What Was Created

Your project now has production-ready Supabase Edge Functions for managing car reservations:

```
✅ validate-reservation   - Pre-booking validation & pricing calculation
✅ confirm-reservation    - Create & confirm bookings with payment info
✅ generate-contract      - Generate professional rental contracts
✅ booking.service.ts     - React service layer for frontend integration
✅ Database schema        - Tables, functions, triggers, and RLS policies
✅ Configuration files    - Deno, Supabase, and import mappings
```

---

## 🎯 Quick Setup (5 minutes)

### 1. Install Supabase CLI
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### 2. Authenticate
```bash
supabase login
```

Follow the browser prompt to authenticate.

### 3. Link to Your Project
```bash
cd supabase
supabase link --project-ref <your-project-ref>
```

Get your project ref from: **Supabase Dashboard > Settings > General > Project Ref**

### 4. Deploy Functions
```bash
supabase functions deploy
```

This deploys all three functions to production.

### 5. Set Environment Secrets (Production Only)
Go to **Supabase Dashboard > Edge Functions > Secrets** and set:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🗄️ Database Setup

### Option A: Using SQL Editor (Recommended for beginners)

1. Go to **Supabase Dashboard > SQL Editor**
2. Click **New Query**
3. Copy the entire contents of: `supabase/migrations/20240518_booking_system.sql`
4. Paste into the editor
5. Click **Run**

### Option B: Using Supabase CLI

```bash
supabase migration new booking_system
# Copies the SQL to supabase/migrations/
supabase db push
```

---

## 📱 Frontend Integration

### 1. Import the Service
```typescript
import {
  validateReservation,
  confirmReservation,
  generateContract,
  completeBooking,
} from './services/booking.service'
```

### 2. Use in Your Component
```typescript
// Simple example
const result = await completeBooking({
  car_id: '123e4567-e89b-12d3-a456-426614174000',
  user_id: currentUser.id,
  start_date: '2024-06-01',
  end_date: '2024-06-05',
  pickup_location: 'Airport',
  dropoff_location: 'Downtown',
  passenger_name: 'John Doe',
  passenger_phone: '+1-555-0123',
  passenger_email: 'john@example.com',
  insurance_selected: true,
})

if (result.success) {
  console.log('Booking confirmed!', result.bookingId)
  // Download contract
  window.open(result.contractUrl)
}
```

### 3. Use the Example Component
Copy and use `BookingExample.jsx` as a template:
```typescript
import BookingExample from './components/BookingExample'

export default function Page() {
  return <BookingExample car={carData} currentUser={userData} />
}
```

---

## 🧪 Testing

### Local Testing (Supabase Local)

```bash
# Start local Supabase
supabase start

# Functions are now at: http://localhost:54321/functions/v1

# View logs in real-time
supabase functions logs validate-reservation --tail

# Test function with curl
curl -X POST http://localhost:54321/functions/v1/validate-reservation \
  -H "Content-Type: application/json" \
  -d '{
    "car_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "987e6543-e89b-12d3-a456-426614174999",
    "start_date": "2024-06-01T10:00:00Z",
    "end_date": "2024-06-05T10:00:00Z",
    "pickup_location": "Airport",
    "dropoff_location": "Downtown"
  }'

# Stop when done
supabase stop
```

### Production Testing

Functions auto-deploy to production. Test directly:

```bash
# View production logs
supabase functions logs validate-reservation --prod

# Monitor in Supabase Dashboard > Edge Functions
```

---

## 📊 Project Structure

```
hmhouticars-v3-newdesign/
├── supabase/
│   ├── config.toml                    # Project config
│   ├── deno.json                      # Deno/Deno runtime config
│   ├── functions/
│   │   ├── validate-reservation/
│   │   │   └── index.ts              # Validation function
│   │   ├── confirm-reservation/
│   │   │   └── index.ts              # Confirmation function
│   │   ├── generate-contract/
│   │   │   └── index.ts              # Contract generation
│   │   └── import_map.json           # Deno imports
│   └── migrations/
│       └── 20240518_booking_system.sql  # DB schema
│
├── src/
│   ├── services/
│   │   ├── booking.service.ts        # ⭐ Frontend integration
│   │   └── auth.service.js
│   ├── components/
│   │   └── BookingExample.jsx        # ⭐ Example component
│   └── ...
│
├── EDGE_FUNCTIONS_GUIDE.md           # ⭐ Full documentation
├── QUICK_START.md                    # ⭐ This file
└── ...
```

---

## 🔗 API Endpoints

All functions are available at:

**Development (Local):**
```
POST http://localhost:54321/functions/v1/validate-reservation
POST http://localhost:54321/functions/v1/confirm-reservation
POST http://localhost:54321/functions/v1/generate-contract
```

**Production:**
```
POST https://your-project.supabase.co/functions/v1/validate-reservation
POST https://your-project.supabase.co/functions/v1/confirm-reservation
POST https://your-project.supabase.co/functions/v1/generate-contract
```

---

## 🔐 Security Checklist

- ✅ JWT validation enabled
- ✅ CORS configured
- ✅ RLS policies on database tables
- ✅ Service role secrets configured
- ✅ Environment variables protected

For production:
- [ ] Enable HTTPS only
- [ ] Configure allowed origins
- [ ] Set rate limiting
- [ ] Enable logging/monitoring
- [ ] Regular security audits

---

## 🐛 Common Issues

### "Function not found"
```bash
supabase functions list  # Check if deployed
supabase functions deploy  # Redeploy
```

### "Service role key error"
Set secrets in **Supabase Dashboard > Edge Functions > Secrets**

### CORS errors
Functions already include CORS headers. Check network tab for real error.

### Database connection issues
```bash
supabase db start  # Restart database
supabase status    # Check all services
```

---

## 📚 Next Steps

1. ✅ **Deploy Functions** → `supabase functions deploy`
2. ✅ **Setup Database** → Run migration SQL
3. ✅ **Test Functions** → Use provided examples
4. ✅ **Integrate Frontend** → Import `booking.service.ts`
5. ✅ **Add UI Component** → Use `BookingExample.jsx`
6. ✅ **Configure Storage** → For contract storage (optional)

---

## 📖 Full Documentation

See **EDGE_FUNCTIONS_GUIDE.md** for:
- Detailed API specifications
- Advanced configuration
- Monitoring & logging
- Troubleshooting guide
- Production deployment

---

## 🆘 Getting Help

1. Check **EDGE_FUNCTIONS_GUIDE.md** troubleshooting section
2. View function logs: `supabase functions logs <name> --tail`
3. Check Supabase Dashboard > Edge Functions
4. Review browser DevTools Network tab
5. Check database logs in Supabase Dashboard

---

## ✨ Features Implemented

### validate-reservation
- ✅ Check car availability
- ✅ Validate date ranges
- ✅ Verify user account status
- ✅ Calculate pricing with insurance/taxes
- ✅ Return warnings (long-term rentals)

### confirm-reservation
- ✅ Create booking record
- ✅ Generate booking reference
- ✅ Calculate final pricing
- ✅ Send confirmation email (hook for SendGrid/Resend)
- ✅ Update car availability

### generate-contract
- ✅ Generate professional HTML contract
- ✅ Include all booking details
- ✅ Store in Supabase Storage
- ✅ Generate downloadable URL
- ✅ Save contract record in database

---

## 🎉 You're Ready!

Your booking system is now:
- ✅ Production-ready
- ✅ Fully typed (TypeScript)
- ✅ Secure (JWT, RLS, CORS)
- ✅ Scalable (Supabase Edge Functions)
- ✅ Professional (Contracts & Email ready)

Start building! 🚗💨

---

**Last Updated:** May 18, 2024  
**Version:** 1.0.0  
**Status:** Production Ready
