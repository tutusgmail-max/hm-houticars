# Inscription ultra-rapide — checklist Supabase + Vercel

## Supabase Dashboard (`ertdqfavrkomikszagtc`)

### Authentication → Providers
| Paramètre | Valeur |
|-----------|--------|
| **Email** | ON |
| **Confirm email** | **OFF** (session immédiate) |
| Phone / Magic Link / OTP | OFF (optionnel) |
| MFA | OFF |

### Authentication → URL configuration
- **Site URL** : URL Vercel production
- **Redirect URLs** : `https://VOTRE-DOMAINE/**`, `http://localhost:5173/**`, `http://localhost:5174/**`

### Authentication → Rate limits
Augmenter si possible les limites **signup** et **sign-in** (selon votre plan Supabase).

## Vercel Production
```
VITE_SUPABASE_URL=https://ertdqfavrkomikszagtc.supabase.co
VITE_SUPABASE_ANON_KEY=<clé anon uniquement>
```
Redéployer après modification.

## Frontend (déjà en place)
- Email + mot de passe, min 6 caractères
- Anti double-clic (une requête à la fois)
- Pas de cooldown client
- Auto connexion après signup si session absente
- Messages : succès / email déjà utilisé / erreur de connexion
