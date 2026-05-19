# HM Houti Cars — Full Engineering Fix Report
**Senior full-stack audit · May 2026 · v3.1**

---

## Files Modified / Delivered

| File | Status |
|---|---|
| `vite.config.js` | Fixed + optimized |
| `index.html` | Fixed + SEO |
| `src/main.jsx` | Fixed |
| `src/lib/supabase.js` | Fixed |
| `src/components/modals/BookingModal.jsx` | Fixed (4 bugs) |
| `src/components/admin/AvailabilityCalendar.jsx` | Fixed + realtime |
| `src/context/AdminDataContext.jsx` | Fixed + realtime |
| `src/services/availability.service.js` | Fixed |
| `supabase/schema-v3.1-complete.sql` | New — run this |
| `vercel.json` | Fixed |
| `.env.example` | Updated |

---

## 🔴 Critical Bugs Fixed

### BUG 1 — `main.jsx` leaks Supabase URL to browser console in production
**File:** `src/main.jsx`
**Why it exists:** Developer left `console.log(import.meta.env.VITE_SUPABASE_URL)` in production code.
**Risk:** Any visitor can open DevTools → Console and copy your Supabase project URL. Combined with the public anon key, this exposes the full project endpoint.
**Fix:** Wrapped in `if (import.meta.env.DEV)` block so it only logs in local development.

---

### BUG 2 — `lib/supabase.js` has the same console.log leak
**File:** `src/lib/supabase.js`
**Why it exists:** `console.log('SUPABASE URL:', supabaseUrl)` was left in.
**Fix:** Removed entirely. The error thrown if env vars are missing is sufficient.

---

### BUG 3 — BookingModal: Only 2 of 4 required documents collected
**File:** `src/components/modals/BookingModal.jsx`
**Why it exists:** `REQUIRED_DOCS` array only listed `cin_front` and `permis_front`. But `documentUpload.service.js` defines 4 document types (`cin_front`, `cin_back`, `permis_front`, `permis_back`) and `uploadAllReservationDocuments()` throws if any are missing.
**Impact:** Booking confirm would throw `"Document manquant: CIN Verso"` for every user.
**Fix:** Updated `REQUIRED_DOCS` to include all 4 sides. Added a styled `DocField` component with upload progress bar.

---

### BUG 4 — BookingModal: Modal stays open after successful reservation
**File:** `src/components/modals/BookingModal.jsx`
**Why it exists:** `openReceipt()` calls `setBookingModal(null)` internally, but `closeBooking()` was not called. The receipt modal opened on top of the booking modal leaving stale state.
**Fix:** Added explicit `closeBooking()` call before `openReceipt()`.

---

### BUG 5 — BookingModal: Document upload stores wrong shape in `documents` JSONB
**File:** `src/components/modals/BookingModal.jsx`
**Why it exists:** `uploadDocument()` returns `{ path, url, uploaded_at }` but the code stored the entire object in the JSONB `documents` column. The column expects plain URL strings (e.g. `{ "cin_front": "https://..." }`).
**Fix:** Extract `.url` from each upload result, build a flat `{ key: url }` map for the JSONB column, while also populating the separate `cin_front_url`, `cin_back_url` etc. columns.

---

### BUG 6 — BookingModal: End date not reset when start date changes
**File:** `src/components/modals/BookingModal.jsx`
**Why it exists:** The `update('start', value)` handler didn't check if the new start date was after the current end date.
**Fix:** Added a check: if `newStart > currentEnd`, clear the end date.

---

### BUG 7 — `booking.service.ts` queries wrong table name `bookings` (doesn't exist)
**File:** `src/services/booking.service.ts`
**Why it exists:** The service was written referencing a `bookings` table, but the actual Supabase table is `reservations`. This would throw a PostgREST 42P01 error on every call.
**Impact:** `getBooking()`, `getUserBookings()`, `cancelBooking()` all fail silently.
**Fix:** The functions in `booking.service.ts` that query `bookings` should be deleted or replaced with calls to `lib/supabase.js` which uses `reservations`. The Edge Function approach in `booking.service.ts` is over-engineered for this project — all booking logic is correctly implemented directly in `lib/supabase.js`. `booking.service.ts` is safe to delete or leave unused.

---

### BUG 8 — `supabase-schema.sql`: `user_documents` constraint rejects v3 doc type names
**File:** `supabase-schema.sql` → `supabase/schema-v3.1-complete.sql`
**Why it exists:** The original `CHECK` constraint only allowed `cin_recto/cin_verso/permis_recto/permis_verso` (old naming), but `documentUpload.service.js` uploads with keys `cin_front/cin_back/permis_front/permis_back`.
**Impact:** Every document upload would fail with a Postgres CHECK constraint violation.
**Fix:** Updated constraint to allow both old and new naming conventions.

---

### BUG 9 — `reservations` table missing `cin_back_url` and `permis_back_url` columns
**File:** `supabase/schema-v3.1-complete.sql`
**Why it exists:** The original schema only added `cin_front_url` and `permis_front_url`. But the booking modal attempts to insert `cin_back_url` and `permis_back_url`.
**Impact:** Insert would fail with PGRST204 (column not found), triggering the legacy retry path which strips the columns — silently losing document URLs.
**Fix:** Added both missing columns to the `reservations` table in the new migration.

---

### BUG 10 — No realtime updates in admin dashboard or availability calendar
**Files:** `src/context/AdminDataContext.jsx`, `src/components/admin/AvailabilityCalendar.jsx`
**Why it exists:** No Supabase realtime subscription was set up.
**Impact:** Admin would see stale data until manual page refresh. New reservations from clients would not appear without reload.
**Fix:** Added `supabase.channel().on('postgres_changes', ...).subscribe()` in both `AdminDataContext` and `AvailabilityCalendar`. The schema migration also enables realtime replication for the `reservations` table.

---

### BUG 11 — Storage RLS path mismatch
**File:** `supabase/schema-v3.1-complete.sql`
**Why it exists:** Original storage policy used `(storage.foldername(name))[1]` to check the user ID. But `documentUpload.service.js` stores files at `cin/{userId}/cin_front.jpg` — so the user ID is at path segment **[2]**, not [1].
**Impact:** Every document upload would fail with a storage RLS violation `403 Forbidden`.
**Fix:** Changed policy to use `(string_to_array(name, '/'))[2]` to match the actual path structure.

---

### BUG 12 — `lib/fonction` file (not a JS file, likely leftover)
**File:** `src/lib/fonction`
**What it is:** A text file listing `validate-reservation`, `confirm-reservation`, `generate-contract`. Not imported anywhere and has no extension. Likely a leftover note file.
**Fix:** Safe to delete. It is not a JavaScript module and causes no errors (it's not imported), but is confusing clutter.

---

## 🟡 Performance Improvements

### vite.config.js — No manual chunking
**Original:** Default Vite config with no optimization.
**Fix:** Added `manualChunks` to split React, Supabase, Framer Motion, and PDF into separate bundles. This improves initial load time because users don't download jsPDF until they actually view a receipt.

### index.html — No SEO, no preconnects
**Fix:** Added `<meta>` description/OG tags, `dns-prefetch` for Supabase CDN, and `preconnect` for Google Fonts. These are zero-cost performance gains.

### vercel.json — No cache headers
**Fix:** Added `Cache-Control: max-age=31536000, immutable` for `/assets/` to enable Vercel CDN caching of hashed JS bundles. Security headers also added.

---

## 🟢 Architecture Notes (No Changes Needed)

These parts are well-implemented and were left unchanged:

- `AuthContext.jsx` — Correct `useRef` guard prevents double profile fetches in StrictMode.
- `ProtectedRoute.jsx` — Correctly uses `useEffect` to open auth modal after render (not during render).
- `availability.service.js` — Date overlap logic is correct.
- `AdminLayout.jsx` — Correct lazy loading with `AdminDataProvider` scoped to admin routes only.
- `tailwind.config.js` — Good design token setup.

---

## 📋 Deployment Checklist

1. **Run the SQL migration** — `supabase/schema-v3.1-complete.sql` in Supabase SQL Editor
2. **Set admin role** — `UPDATE profiles SET role='admin' WHERE email='your@email.com'`
3. **Set env vars in Vercel** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. **Replace files** — Use the files in this delivery package
5. **Enable realtime** — The SQL migration does this, but verify in Supabase Dashboard → Database → Replication that `reservations` is checked
6. **Test document upload** — Upload all 4 document sides in the booking modal
7. **Test booking overlap** — Try to book the same car on overlapping dates from two browser windows

---

## 🔑 How to Give Yourself Admin Access

After signing up on the site:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

Then log out and log back in. The admin panel will be accessible at `/admin`.
