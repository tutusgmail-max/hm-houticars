# Vercel environment sync (ertdqfavrkomikszagtc)

Update **Production** and **Preview** in Vercel Dashboard → Project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://ertdqfavrkomikszagtc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(anon key from Supabase → Settings → API — same as local `.env`)* |

After saving, **Redeploy** the latest deployment so Vite picks up the new vars.

CLI (if logged in with `npx vercel login`):

```powershell
cd C:\Users\dbi\Downloads\hm-houticars-github-push
npx vercel env rm VITE_SUPABASE_URL production --yes
npx vercel env add VITE_SUPABASE_URL production
# paste: https://ertdqfavrkomikszagtc.supabase.co

npx vercel env rm VITE_SUPABASE_ANON_KEY production --yes
npx vercel env add VITE_SUPABASE_ANON_KEY production
# paste anon key from .env
```

Never add `service_role` to Vercel frontend env.
