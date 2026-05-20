# HM Houti Cars — Production-Grade Car Rental Platform

A full-stack car rental application built with **React 19 + Vite + Supabase**.  
Supports public booking, authenticated user dashboard, and an admin panel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion |
| Auth & DB | Supabase (PostgreSQL + Row-Level Security) |
| Edge Functions | Supabase Deno Functions |
| Icons | Lucide React, React Icons |
| PDF | jsPDF |
| Routing | React Router v7 |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── auth/                     # Auth context + protected route guard
│   ├── AuthContext.jsx       # Global auth state, profile, documents
│   └── ProtectedRoute.jsx    # Route guard (user + admin)
├── components/
│   ├── admin/                # Admin panel components
│   │   ├── ui/               # Admin-specific primitives (cards, badges, charts)
│   │   ├── AdminFleetPanel.jsx
│   │   ├── AdminHeader.jsx
│   │   ├── AdminSidebar.jsx
│   │   ├── AvailabilityCalendar.jsx
│   │   ├── CarFormModal.jsx
│   │   ├── CustomersManagement.jsx
│   │   ├── DocumentsCenter.jsx
│   │   ├── FleetManagement.jsx
│   │   ├── ImageDropzone.jsx
│   │   ├── ReservationManagement.jsx
│   │   └── SettingsPanel.jsx
│   ├── auth/                 # Auth form primitives
│   ├── booking/              # Document upload flow
│   ├── modals/               # AuthModal, BookingModal, ReceiptModal
│   ├── profile/              # Identity documents section
│   ├── ui/                   # Shared: Toast, Skeleton, LazyImage, FullPageLoader
│   ├── CarCard.jsx
│   ├── Footer.jsx
│   ├── Hero.jsx
│   └── Navbar.jsx
├── constants/                # Static data (identity document types)
├── context/
│   ├── AdminDataContext.jsx  # Admin panel data (reservations, profiles)
│   ├── AppContext.jsx        # Global UI state (modals, booking flow)
│   └── CarsContext.jsx       # Fleet data with Supabase + fallback
├── data/                     # Static fallback fleet data
├── hooks/                    # useScrolled
├── layouts/                  # AdminLayout
├── lib/
│   ├── supabase.js           # Supabase client + typed DB helpers
│   └── database.types.ts     # Generated Supabase types
├── pages/
│   ├── admin/                # Lazy-loaded admin sub-pages
│   ├── AdminApp.jsx          # Admin router entry
│   ├── DashboardPage.jsx     # User dashboard
│   ├── HomePage.jsx          # Landing page
│   ├── ResetPasswordPage.jsx
│   └── *Section.jsx          # Landing page sections (Cars, Contact, Process…)
├── services/                 # Supabase service layer (one file per domain)
│   ├── auth.service.js
│   ├── availability.service.js
│   ├── booking.service.ts
│   ├── cars.service.js
│   ├── documentUpload.service.js
│   ├── identityDocuments.service.js
│   ├── profile.service.js
│   └── adminSettings.service.js
└── utils/                    # Pure helpers: PDF, CSV export, validation, image compression

supabase/
├── functions/                # Edge functions (deployed to Supabase)
│   ├── confirm-reservation/index.ts
│   ├── generate-contract/index.ts
│   └── validate-reservation/index.ts
├── migrations/               # Chronological SQL migrations
├── deno.json
├── functions/import_map.json
└── schema.sql                # Full schema reference
```

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your Supabase URL and anon key
```

### 3. Run migrations
Apply all files in `supabase/migrations/` in order via the Supabase dashboard SQL editor or CLI.

#### Critical: RLS for user documents
If you see an error like:
`new row violates row-level security policy for table "user_documents"`
it means the RLS policies were not applied to your Supabase database.

This repo includes a hardened migration that fixes:
- `public.user_documents` (users can CRUD only their own rows; admins can manage all)
- `storage.objects` for bucket `documents` (users can manage only their own files)
- `public.profiles` hardening (prevents self-promoting to admin via updates)

Apply it using either:

**Supabase CLI**
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Supabase Dashboard → SQL Editor**
Run:
`supabase/migrations/20260529000000_security_rls_fixes.sql`

If your database already had legacy policies, also run:
`supabase/migrations/20260530000000_policy_cleanup.sql`

### 4. Deploy edge functions
```bash
supabase functions deploy confirm-reservation
supabase functions deploy validate-reservation
supabase functions deploy generate-contract
```

### 5. Start dev server
```bash
npm run dev
```

---

## Deployment (Vercel)

```bash
npm run build
# or use deploy.sh / deploy.bat for a guided flow
```

The `vercel.json` is pre-configured for SPA fallback routing.

---

## Admin Access

Set `role = 'admin'` on a user's profile row in Supabase to grant admin access.  
Admin panel is at `/admin` and is fully protected server-side via RLS.

Example (run in Supabase SQL Editor with service role privileges):
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

## Smoke test (RLS)
To verify your RLS policies end-to-end with a real authenticated user:
```bash
# set env vars then:
node scripts/supabase-smoke-test.mjs
```
