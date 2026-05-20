# HM Houti Cars — Production v4.1

Système professionnel de location de voitures — React + Vite + Supabase.

## 🚀 Démarrage rapide

```bash
cp .env.example .env
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

## 🗄️ Base de données

**Une seule migration à exécuter :**

1. Ouvrir [supabase.com](https://supabase.com) → votre projet → SQL Editor → New query
2. Coller le contenu de `supabase/MIGRATION_PRODUCTION_FINAL.sql`
3. Cliquer **Run**
4. Décommenter et exécuter la ligne admin en bas du fichier

## 🔑 Compte admin

Après votre premier signup sur le site :

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'votre@email.com';
```

## 📁 Architecture

```
src/
├── auth/           # AuthContext, ProtectedRoute
├── components/
│   ├── admin/      # Dashboard, Réservations, Fleet, Documents, Notifications
│   ├── booking/    # Upload documents réservation
│   ├── modals/     # BookingModal, AuthModal, ReceiptModal
│   └── ui/         # Composants réutilisables
├── context/        # AppContext, CarsContext, AdminDataContext
├── hooks/          # useScrolled, useAdminNotifications
├── lib/            # supabase.js (client + helpers)
├── pages/          # HomePage, DashboardPage, pages admin
└── services/       # auth, booking, cars, documentUpload, etc.

supabase/
└── MIGRATION_PRODUCTION_FINAL.sql   ← Exécuter en premier
```

## ✅ Fonctionnalités

### Client
- Réservation complète (calendrier premium, upload CIN + permis)
- Dashboard personnel (réservations, profil, sécurité)
- Statuts temps réel (en attente / confirmée / refusée)
- WhatsApp automatique après réservation

### Admin
- Dashboard avec stats, graphiques, activité récente
- Gestion réservations (confirm/refus, filtres, export CSV)
- Centre documents (preview images + PDF)
- Notifications temps réel (bell icon)
- Gestion flotte (CRUD voitures)
- Calendrier disponibilité

### Technique
- Realtime Supabase (channels propres, cleanup, no memory leaks)
- RLS policies complètes (sécurité row-level)
- Upload sécurisé (bucket privé, signed URLs)
- Overlap check DB-level (trigger)
- Notifications admin auto (trigger SQL)
- Build optimisé (code splitting, sourcemaps)
- SPA routing (vercel.json)
- Mobile responsive

## 🚢 Déploiement Vercel

```bash
vercel --prod
```

Variables d'environnement à configurer dans Vercel :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
