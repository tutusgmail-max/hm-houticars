# HM Houti Cars — Supabase debug & production guide

## Project ref (synced)

| Source | Project ref |
|--------|-------------|
| Local `.env` | `ertdqfavrkomikszagtc` |
| Supabase CLI (`supabase/.temp/project-ref`) | `ertdqfavrkomikszagtc` |
| Vercel | Update via `docs/VERCEL_ENV_SYNC.md` then redeploy |

```env
VITE_SUPABASE_URL=https://ertdqfavrkomikszagtc.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from dashboard>
```

---

## RLS (fixed via migration)

Live audit on `ertdqfavrkomikszagtc` found:

- `public.profiles` — policies existed but **RLS OFF** (security error)
- `public.reservations` — policies existed but **RLS OFF**

**Applied fix:** migration `enable_rls_critical` — only `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (policies already defined). **Not dangerous** — it activates existing rules; does not delete data.

After this, clients must use a **valid session** for inserts (signup/login).

---

## Dashboard checklist (Auth — rate limits & signup)

**Authentication → Providers → Email**

| Setting | Required for this app |
|---------|------------------------|
| Enable Email provider | ON |
| Confirm email | **OFF** (instant session on signup) |
| Secure email change | optional |
| Double confirm changes | OFF |

**Authentication → URL configuration**

| Field | Value |
|-------|--------|
| Site URL | `https://your-production-domain` or `http://localhost:5173` |
| Redirect URLs | `http://localhost:5173/**`, `http://localhost:5174/**`, `https://YOUR_DOMAIN/**`, `http://localhost:5173/reset-password` |

**Rate limits (why you see “after N seconds”)**

Supabase limits **signup / password reset / OTP** per IP and email. The frontend cannot bypass this.

- One `signUp` per button click (fixed via global auth queue in `src/utils/authRequestGuard.js`).
- Do **not** retry signup on the same email within 60s — use **Login** instead.
- Testing: use **new emails** (`test+1@gmail.com`) or wait for cooldown.

---

## Frontend architecture (safe)

| Rule | Implementation |
|------|----------------|
| Single Supabase client | `src/lib/supabase.js` only |
| All Auth HTTP via queue | `src/services/auth.service.js` + `runAuthRequest()` |
| No `service_role` in browser | Validated at startup (JWT role check) |
| Session storage | `localStorage` key `hmhouticars-auth` |
| One auth listener | `authOnChange()` single callback slot |

**Never put in `.env` or Vite:**

- `SUPABASE_SERVICE_ROLE_KEY`
- `service_role` JWT as `VITE_SUPABASE_ANON_KEY`

Service role belongs only in **Edge Functions** secrets (`supabase/functions/*`), not the React app.

---

## Database schema (expected)

### `public.profiles`

- `id` → `auth.users.id`
- `role` → `'client'` | `'admin'`
- Trigger `on_auth_user_created` → `handle_new_user()` (auto row on signup)

### `public.reservations`

- RLS: user INSERT/SELECT own rows; authenticated SELECT `pending`+`confirmed` for calendar; admin full access via `is_admin()`
- FK: `user_id` → `profiles(id)` (for admin join `profiles(...)`)
- Triggers: `set_reservation_ref`, `fill_reservation_car_snapshot`, `notify_admin_new_reservation`

### `public.user_documents` + Storage bucket `documents`

- Private bucket; signed URLs from app
- RLS: users CRUD own rows; admins read all

### `public.cars`

- Public read available cars; admin CRUD

### Helper `public.is_admin()`

- `SECURITY DEFINER` — **intentional** to avoid RLS recursion on `profiles`
- Not dangerous if function body only checks `profiles.role` (no user input)

---

## RLS policies (summary)

Run verification SQL: `supabase/migrations/20260531000000_production_verify_and_repair.sql` in SQL Editor.

| Table | Client | Admin |
|-------|--------|-------|
| profiles | own row | `is_admin()` manage all |
| reservations | own + avail dates | all |
| user_documents | own | read all |
| cars | read available | CRUD |
| notifications | — | manage |

---

## Signup / login flow (app)

```
User submits AuthModal
  → authSignUp / authSignIn (one HTTP call, global queue)
  → Supabase returns session (if Confirm email OFF)
  → onAuthStateChange INITIAL_SESSION / SIGNED_IN
  → AuthContext sets user, loads profile (DB, not auth spam)
  → handle_new_user trigger already created profile
```

If signup returns **user but no session**: email confirmation is ON in dashboard — turn it OFF or use login.

---

## CLI commands

```powershell
cd C:\Users\dbi\Downloads\hm-houticars-github-push

# 1) Login & link correct project
npx supabase login
npx supabase link --project-ref ertdqfavrkomikszagtc

# 2) Diff local migrations vs remote (read-only)
npx supabase db diff

# 3) Push migrations (writes to linked project — confirm ref first!)
npx supabase db push

# 4) Repair remote schema without deleting data (run in SQL Editor is safer for prod)
# Copy contents of: supabase/migrations/20260531000000_production_verify_and_repair.sql

# 5) Reload PostgREST schema cache after DDL
# Included: NOTIFY pgrst, 'reload schema';
```

---

## Smoke tests (local)

```powershell
# Load .env into shell (PowerShell)
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+)=(.*)$') { Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim() }
}

# Existing RLS test (needs existing user)
$env:TEST_EMAIL="your@test.com"
$env:TEST_PASSWORD="yourpassword"
node scripts/supabase-smoke-test.mjs

# Full auth + reservation audit (optional TEST_SIGNUP_EMAIL for new signup)
node scripts/supabase-production-audit.mjs
```

---

## Dangerous changes (do NOT apply without review)

| Change | Risk |
|--------|------|
| Disable RLS on any table | Exposes all rows to anon key |
| Public `documents` bucket | Identity document URLs leak |
| `service_role` in frontend | Full database bypass |
| Remove `block_profile_role_change` | Users could set `role=admin` |
| Lower Supabase auth rate limits in dashboard | More lockouts during testing |

---

## Cursor Supabase plugin (MCP)

In Cursor, the **Supabase MCP** connects your agent to your Supabase account after you authenticate:

1. Cursor Settings → MCP → enable **Supabase**
2. In chat, approve **`mcp_auth`** when prompted (browser login)
3. Then the agent can list projects, run SQL, inspect tables — on the **linked** project

Always confirm the MCP-selected project matches `ertdqfavrkomikszagtc` (your app `.env`).

---

## Files to run on production DB (idempotent)

1. `supabase/migrations/20260531120000_enable_rls_critical.sql` — **applied** on `ertdqfavrkomikszagtc`  
2. `supabase/migrations/20260531000000_production_verify_and_repair.sql` — safe repair + policy refresh  
3. If never applied: `20260530200000_production_schema_repair.sql`

After SQL: Dashboard → Settings → API → **Reload schema** (or wait ~1 min).
