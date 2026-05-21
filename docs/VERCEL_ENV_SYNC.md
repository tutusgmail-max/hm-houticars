# Vercel ↔ localhost sync (ertdqfavrkomikszagtc)

**Production URL:** https://hm-houticars.vercel.app

## Root cause (confirmed)

| Environment | Supabase project | Cars in DB |
|-------------|------------------|------------|
| **localhost** (`.env` correct) | `ertdqfavrkomikszagtc` | 5 cars (live fleet) |
| **Vercel** (wrong env at build) | `cmoioidgxealxfirkssc` | Other / stale data |

Vite bakes `VITE_*` into the JS bundle at **build time**. Changing env in Vercel without a **new deploy** leaves the old project ref in `assets/supabase-*.js`.

Check production:

```powershell
.\scripts\probe-vercel-bundle.ps1
```

Expected: `[PASS] Production bundle uses ertdqfavrkomikszagtc`

## Fix in Vercel Dashboard (required)

Project → **Settings** → **Environment Variables** → **Production** and **Preview**:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://ertdqfavrkomikszagtc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(anon key from Supabase → Settings → API — same as local `.env`)* |

1. **Delete** any old values pointing to `cmoioidgxealxfirkssc`.
2. **Save** both variables for Production **and** Preview.
3. **Deployments** → latest → **⋯** → **Redeploy** (uncheck “Use existing Build Cache” if shown).

Never add `service_role` to `VITE_*` variables.

## CLI sync (optional)

```powershell
cd C:\Users\dbi\Downloads\hm-houticars-github-push
npx vercel login
npx vercel link
.\scripts\sync-vercel-env.ps1
npx vercel --prod
.\scripts\probe-vercel-bundle.ps1
```

If `npx vercel` fails with TLS errors, use the Dashboard steps above.

## Build guard

`npm run build` runs `scripts/verify-vite-env.mjs` and **fails** if env targets the wrong project. That stops shipping another bundle wired to `cmoioidgxealxfirkssc`.

## Supabase Dashboard (auth + redirects)

| Setting | Value |
|---------|--------|
| **Auth → Providers → Email** | Enabled |
| **Confirm email** | **OFF** (instant session) |
| **Site URL** | `https://hm-houticars.vercel.app` |
| **Redirect URLs** | `https://hm-houticars.vercel.app/**`, `http://localhost:5173/**`, `http://localhost:5174/**`, `*/reset-password` |

Project ref: **ertdqfavrkomikszagtc**

## After redeploy — smoke tests

```powershell
npm run test:auth
.\scripts\probe-vercel-bundle.ps1
```

In the browser on https://hm-houticars.vercel.app :

1. F12 → Console → `[HM] Supabase project` → `projectRef: "ertdqfavrkomikszagtc"`
2. Fleet section shows the same 5 cars as localhost.
3. Signup + login on production.

## Migrations

All SQL under `supabase/migrations/` must be applied on **ertdqfavrkomikszagtc** (Supabase SQL Editor or `npx supabase db push`).

## Si l’inscription affiche une mauvaise erreur

1. DevTools → Console → `[Auth] signUp`
2. `SUPABASE_CONFIG` / `ref_mismatch` → fix Vercel env + redeploy
3. `npm run test:auth` locally
