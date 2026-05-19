# HM Houti Cars — Booking System Fixes v3.1

## Vue d'ensemble

Ce document détaille tous les bugs corrigés et les améliorations apportées au système de réservation.

---

## Fichiers modifiés

| Fichier | Changements |
|---------|-------------|
| `src/components/modals/BookingModal.jsx` | Refonte complète — 12 bugs corrigés |
| `src/context/AppContext.jsx` | Auth race condition + TTL pending bookings |
| `src/components/admin/AvailabilityCalendar.jsx` | Realtime + couleurs + détail par jour |
| `src/context/AdminDataContext.jsx` | Ajout alias `refreshAll` |
| `supabase/migrations/20260519_booking_system_v31_fixes.sql` | Schéma complet + RLS + trigger anti-overlap |

---

## Bugs corrigés dans BookingModal

### 1. Race condition auth
**Avant :** Le modal se fermait immédiatement si `authLoading = true` pendant l'ouverture.  
**Après :** Le `useEffect` attend que `authLoading` passe à `false` avant d'agir. Si l'utilisateur n'est pas connecté, le modal de réservation reste ouvert conceptuellement mais ouvre l'auth modal.

### 2. Données perdues entre étapes
**Avant :** Navigation retour/avant vidait le formulaire.  
**Après :** Les données du formulaire sont sauvegardées automatiquement dans `sessionStorage` à chaque changement.

### 3. Documents perdus après login/signup
**Avant :** Après connexion, les fichiers uploadés étaient perdus.  
**Après :** Les fichiers sont stockés dans un `useRef` (ne déclenche pas de re-render) + le formulaire est restauré depuis `sessionStorage` après login.

### 4. Erreurs upload silencieuses
**Avant :** Échec d'upload → message générique.  
**Après :** Chaque étape d'upload affiche un progress message précis. Les erreurs Supabase sont propagées et affichées clairement.

### 5. Pas de vérification disponibilité côté client
**Avant :** La vérification d'overlap se faisait uniquement côté serveur au moment de l'insert.  
**Après :** `useCarAvailability` hook charge les dates réservées dès l'ouverture du modal. Les dates bloquées sont affichées en rouge sur les inputs. La validation Step 1 vérifie les overlaps avant de passer à l'étape suivante.

### 6. validateStep appliqué au mauvais step
**Avant :** `validateStep()` tournait même à l'étape 0, affichant des erreurs intempestives.  
**Après :** `goNext()` appelle `validateStep1()` uniquement quand `step === 1`.

### 7. File inputs réinitialisés au re-render
**Avant :** `<input type="file">` contrôlé par state → React réinitialisait le composant.  
**Après :** Les fichiers sont stockés dans `fileRefs.current` (ref), les previews dans un state séparé `docPrev`.

### 8. Mobile layout cassé
**Avant :** Grille 2 colonnes sans responsive sur mobile.  
**Après :** `px-3 py-4` sur mobile, `sm:px-4 sm:py-8` sur tablette. Tous les grids ont `grid-cols-1 sm:grid-cols-2`.

### 9. Loading state non resetté à la fermeture
**Avant :** Si l'utilisateur fermait pendant un upload, le spinner restait.  
**Après :** `setLoading(false)` et `setProgress('')` dans le bloc `finally` de `confirmReservation`.

### 10. Champs manquants — ville et adresse livraison
**Avant :** Pas de champ "ville du client" ni "adresse de livraison".  
**Après :** Deux champs optionnels ajoutés, sauvegardés dans `notes` de la réservation.

### 11. 4 documents requis (pas 2)
**Avant :** Seulement CIN recto + Permis recto demandés.  
**Après :** CIN recto, CIN verso, Permis recto, Permis verso — conformément au schéma `RESERVATION_DOC_KEYS`.

### 12. WhatsApp message incomplet
**Avant :** Message WhatsApp ne contenait pas ville/adresse livraison.  
**Après :** Message complet avec tous les champs optionnels filtrés.

---

## Calendrier admin

### Améliorations
- **Realtime** : Abonnement Supabase `postgres_changes` → le calendrier se met à jour automatiquement sans refresh
- **Indicateur realtime** : Badge vert animé "Temps réel" quand la subscription est active
- **Clic sur un jour** : Panneau de détail montrant les réservations actives ce jour
- **Légende complète** : Disponible (vert), En attente (orange), Confirmé (rouge), Aujourd'hui (or)
- **Point indicateur** : Chaque cellule a un point coloré en bas pour visibilité rapide

---

## SQL Migration

Exécuter dans l'ordre dans Supabase SQL Editor :

```
supabase/migrations/20260519_booking_system_v31_fixes.sql
```

### Ce que fait la migration
1. Ajoute toutes les colonnes manquantes à `reservations` (ref, total, pickup_location, etc.)
2. Synchronise les colonnes aliases (ref/reference, total/total_price)
3. Crée le trigger `update_updated_at_column`
4. Crée/vérifie la table `user_documents`
5. **Recrée toutes les policies RLS** proprement (supprime les anciennes)
6. Configure le bucket `documents` avec limites de taille et types MIME
7. **Trigger anti-overlap** : empêche les double réservations au niveau DB
8. Crée les index pour les queries de disponibilité
9. Active la publication Realtime pour la table `reservations`

---

## Variables d'environnement requises

```env
VITE_SUPABASE_URL=https://VOTRE_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

---

## Déploiement Vercel

Aucun changement de config Vercel requis. Le `vercel.json` existant est compatible.

---

## Checklist validation

- [ ] Exécuter la migration SQL dans Supabase
- [ ] Vérifier que le bucket `documents` est créé (Storage > Buckets)
- [ ] Tester réservation en tant qu'utilisateur non connecté → doit ouvrir auth modal
- [ ] Tester réservation → login → retour → données formulaire restaurées
- [ ] Vérifier upload 4 documents (CIN recto/verso, Permis recto/verso)
- [ ] Vérifier que les dates réservées apparaissent en rouge dans le calendrier
- [ ] Tenter une double réservation → doit être bloquée
- [ ] Vérifier le calendrier admin se met à jour en temps réel
