# HM Houti Cars — Premium Platform v2.0

A 2026-grade luxury car rental platform built with React + Vite + TailwindCSS + Framer Motion + Supabase.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your Supabase URL and anon key
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire `supabase-schema.sql` file
3. Copy your **Project URL** and **anon key** from Settings → API into `.env`

### 4. Run development server
```bash
npm run dev
```

### 5. Make yourself admin
After signing up through the app, run in Supabase SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'your@email.com';
```
Then refresh the app — you'll see the **Admin** link in the navbar.

---

## 🏗️ Architecture

```
src/
├── components/
│   ├── modals/
│   │   ├── AuthModal.jsx        # Login / Signup / Forgot password
│   │   ├── BookingModal.jsx     # 3-step reservation wizard
│   │   └── ReceiptModal.jsx     # Confirmation receipt
│   ├── ui/
│   │   └── Toast.jsx            # Notification toasts
│   ├── CarCard.jsx
│   ├── Footer.jsx
│   ├── Hero.jsx
│   └── Navbar.jsx
├── context/
│   └── AppContext.jsx           # Global state + auth
├── data/
│   └── index.js                 # Cars, reviews, copy
├── hooks/
│   └── useScrolled.js
├── lib/
│   └── supabase.js              # All Supabase calls
└── pages/
    ├── AdminPage.jsx            # Admin dashboard
    ├── CarsSection.jsx
    ├── ContactSection.jsx
    ├── DashboardPage.jsx        # User dashboard
    ├── HomePage.jsx
    ├── ProcessSection.jsx
    ├── ReviewsSection.jsx
    └── WhySection.jsx
```

---

## ✨ Features

### Authentication
- Signup with full name, phone, email, password + confirm
- Login with email/password
- Forgot password (email link)
- Password visibility toggle
- Session persistence across refreshes
- Animated transitions between login/signup/forgot

### Reservation System (3-step wizard)
1. **Step 1 — Car & Dates**: pickup/return location (Oujda/Nador/Berkane), dates, personal info, payment method, dynamic price summary
2. **Step 2 — Documents**: drag & drop CIN recto/verso + permis recto/verso, image preview, Supabase Storage upload
3. **Step 3 — Confirmation**: full recap of reservation + document thumbnails + confirm button

### Supabase Edge Functions (🆕)
**Production-ready booking system with:**
- **validate-reservation**: Pre-booking validation, availability checking, dynamic pricing
- **confirm-reservation**: Create booking records, generate booking references, send confirmations
- **generate-contract**: Professional HTML rental contracts, PDF support, document storage

See [**QUICK_START.md**](./QUICK_START.md) and [**EDGE_FUNCTIONS_GUIDE.md**](./EDGE_FUNCTIONS_GUIDE.md) for deployment & usage.

### User Dashboard (`/dashboard`)
- My reservations with status badges
- Document thumbnail links
- Profile editor (name, phone)
- Logout

### Admin Dashboard (`/admin`)
- Stats: total, pending, confirmed, revenue
- All reservations with status filters
- Approve / Reject / Complete reservations
- View uploaded documents in a modal
- All registered users table

### Design
- **Zero visual changes** — identical to the original luxury black/gold aesthetic
- Fully responsive: mobile → tablet → laptop → desktop → ultrawide
- All original animations, sections, spacing, and typography preserved

---

## 🔐 Security
- Row Level Security (RLS) on all Supabase tables
- Users can only see their own data
- Admins have elevated access via role column
- Storage bucket restricted to owner-only access
- JWT-based session auth via Supabase

---

## 📦 Production Build
```bash
npm run build
# Output: dist/
```

Deploy to Vercel, Netlify, or any static host. Set environment variables in the dashboard.
