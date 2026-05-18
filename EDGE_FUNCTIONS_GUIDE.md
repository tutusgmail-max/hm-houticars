# 📋 Supabase Edge Functions - Deployment & Implementation Guide

## 🏗️ Architecture Overview

```
supabase/
├── functions/
│   ├── validate-reservation/
│   │   └── index.ts          # Validates booking parameters
│   ├── confirm-reservation/
│   │   └── index.ts          # Creates & confirms booking
│   ├── generate-contract/
│   │   └── index.ts          # Generates rental contract
│   ├── import_map.json       # Deno import mappings
│   └── deno.json            # Deno configuration
├── config.toml              # Supabase project config
└── seed.sql                # Database initialization (optional)
```

### Functions Overview

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| **validate-reservation** | Pre-booking validation | Reservation details | Validation status + pricing |
| **confirm-reservation** | Create booking record | Confirmed reservation data | Booking confirmation |
| **generate-contract** | Create rental contract | Booking ID | Contract HTML/PDF + URL |

---

## 🚀 Deployment Steps

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Active Supabase project
- Environment variables configured (.env.local)

### Step 1: Install & Setup Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Verify installation
supabase --version
```

### Step 2: Link Your Supabase Project

```bash
# Login to Supabase
supabase login

# Link to your project
cd supabase
supabase link --project-ref <your-project-ref>
```

Find your project reference at: **Supabase Dashboard > Settings > General > Project Ref**

### Step 3: Deploy Edge Functions to Production

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific functions
supabase functions deploy validate-reservation
supabase functions deploy confirm-reservation
supabase functions deploy generate-contract

# Verify deployment
supabase functions list
```

### Step 4: Test Functions (Local Development)

```bash
# Start Supabase local development
supabase start

# This exposes functions at: http://localhost:54321/functions/v1

# View logs
supabase functions logs validate-reservation --tail
```

---

## 🔗 Integration with React Frontend

### 1. Install Dependencies (Already Done)
```bash
npm install @supabase/supabase-js
```

### 2. Use the Booking Service

```typescript
// src/services/booking.service.ts
import {
  validateReservation,
  confirmReservation,
  generateContract,
  completeBooking,
} from '../services/booking.service'

// Example: Complete booking flow
const bookingData = {
  car_id: 'uuid-123',
  user_id: 'user-uuid',
  start_date: '2024-06-01',
  end_date: '2024-06-05',
  pickup_location: 'Airport Terminal 1',
  dropoff_location: 'Downtown Office',
  passenger_name: 'John Doe',
  passenger_phone: '+1-555-0123',
  passenger_email: 'john@example.com',
  insurance_selected: true,
  special_requests: 'Need infant car seat',
}

const result = await completeBooking(bookingData)
if (result.success) {
  console.log('Booking confirmed!', result.bookingId)
  console.log('Contract URL:', result.contractUrl)
}
```

---

## 📊 Required Database Tables & Schema

Make sure these tables exist in your Supabase database:

### 1. bookings Table
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES cars(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  passenger_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  total_price DECIMAL(10, 2) NOT NULL,
  insurance_included BOOLEAN DEFAULT FALSE,
  special_requests TEXT,
  booking_reference VARCHAR(50) UNIQUE,
  confirmation_date TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. contracts Table
```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  contract_id VARCHAR(100) UNIQUE NOT NULL,
  storage_path TEXT,
  format TEXT DEFAULT 'html', -- html, pdf
  contract_data JSONB,
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. cars Table (Should Already Exist)
```sql
-- Ensure these columns exist on your cars table:
ALTER TABLE cars ADD COLUMN IF NOT EXISTS price_per_day DECIMAL(10, 2);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS transmission VARCHAR(20);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS mileage INTEGER;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS last_booked_at TIMESTAMP;
```

### 4. profiles Table (Should Already Exist)
```sql
-- Ensure these columns exist on your profiles table:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
-- active, suspended, banned
```

---

## 🔐 Security Configuration

### JWT Authentication
The functions verify JWT tokens automatically. Configure in your supabase/config.toml:

```toml
[functions]
verify_jwt = true

[auth]
jwt_secret = "your-super-secret-jwt-token"
jwt_exp = 3600
```

### CORS Settings
All functions include CORS headers for cross-origin requests:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

### Environment Variables for Production
Set these in Supabase Dashboard > Edge Functions > Secrets:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 📱 React Component Example

```typescript
// src/components/BookingForm.jsx
import { useState } from 'react'
import { completeBooking } from '../services/booking.service'
import Toast from './ui/Toast'

export default function BookingForm({ car, user }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    pickup_location: '',
    dropoff_location: '',
    start_date: '',
    end_date: '',
    insurance_selected: false,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await completeBooking({
        car_id: car.id,
        user_id: user.id,
        passenger_name: user.full_name,
        passenger_email: user.email,
        passenger_phone: user.phone,
        ...formData,
      })

      if (result.success) {
        Toast.success(`Booking confirmed! Reference: ${result.bookingId}`)
        // Download contract or redirect
        if (result.contractUrl) {
          window.open(result.contractUrl, '_blank')
        }
      } else {
        Toast.error(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Confirm Booking'}
      </button>
    </form>
  )
}
```

---

## 🐛 Troubleshooting

### Issue: "Function not found" error
**Solution:**
```bash
supabase functions list  # Verify functions are deployed
supabase functions deploy validate-reservation  # Redeploy
```

### Issue: "Service role key not found"
**Solution:**
- Set environment variables in Supabase Dashboard
- Get Service Role Key from: Settings > API Keys > Service Role

### Issue: Functions returning 401 Unauthorized
**Solution:**
- Include Authorization header: `Authorization: Bearer <jwt-token>`
- Or disable JWT verification: Set `verify_jwt = false` in config.toml

### Issue: CORS errors in browser
**Solution:**
- Functions already include CORS headers
- Check browser console for actual error message
- Ensure frontend URL is in allowed origins

### Issue: Database connection timeout
**Solution:**
```bash
supabase db start  # Restart database
supabase status    # Check all services
```

---

## 📈 Monitoring & Logs

### View Function Logs

```bash
# Real-time logs
supabase functions logs validate-reservation --tail

# Recent logs (last 100 lines)
supabase functions logs confirm-reservation

# All functions logs
supabase functions logs
```

### Metrics (Production)
Monitor in Supabase Dashboard:
- Dashboard > Edge Functions > Function Logs
- Dashboard > Database > Logs
- Dashboard > Auth > Logs

---

## 🔄 Updating Functions

### Deploy Updated Function
```bash
# After editing index.ts
supabase functions deploy validate-reservation

# Verify new version
supabase functions logs validate-reservation --tail
```

### Rollback (if needed)
```bash
# Redeploy from git history
git checkout <previous-commit>
supabase functions deploy
```

---

## ✅ Production Checklist

- [ ] All environment variables set in Supabase Dashboard
- [ ] Database tables created with proper schema
- [ ] Service Role Key configured for Edge Functions
- [ ] JWT secret matches between auth and functions
- [ ] CORS configured for production domain
- [ ] Storage bucket created for contracts (documents)
- [ ] Backups enabled for database
- [ ] Error logging configured
- [ ] Functions tested in staging environment
- [ ] Rate limiting configured (if needed)

---

## 📞 Support & Resources

- **Supabase Docs:** https://supabase.com/docs/guides/functions
- **Deno Docs:** https://deno.land/manual
- **Project Repository:** Your GitHub repo
- **Issues:** GitHub Issues

---

## 📝 API Reference

### validate-reservation
```typescript
POST /functions/v1/validate-reservation

Request:
{
  car_id: string
  user_id: string
  start_date: string (ISO 8601)
  end_date: string (ISO 8601)
  pickup_location: string
  dropoff_location: string
}

Response:
{
  valid: boolean
  errors: string[]
  warnings: string[]
  carDetails?: object
  pricing?: {
    dailyRate: number
    durationDays: number
    subtotal: number
    insurance: number
    taxes: number
    total: number
    currency: string
  }
}
```

### confirm-reservation
```typescript
POST /functions/v1/confirm-reservation

Request:
{
  car_id: string
  user_id: string
  start_date: string
  end_date: string
  pickup_location: string
  dropoff_location: string
  passenger_name: string
  passenger_phone: string
  passenger_email: string
  insurance_selected: boolean
  special_requests?: string
}

Response:
{
  success: boolean
  bookingId?: string
  bookingDetails?: object
  error?: string
}
```

### generate-contract
```typescript
POST /functions/v1/generate-contract

Request:
{
  bookingId: string
  includeInsurance?: boolean
  format?: 'html' | 'pdf'
}

Response:
{
  success: boolean
  contractId?: string
  contractUrl?: string
  contractHtml?: string (if format='html')
  error?: string
}
```

---

Generated on: 2024-05-18 | Version: 1.0.0
