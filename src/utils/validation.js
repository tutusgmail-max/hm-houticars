/**
 * validation.js
 * Pure validation functions — no side effects, fully testable.
 */
import { isAuthRateLimited } from './authRequestGuard'

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function validatePhone(phone) {
  return /^[+\d\s().-]{6,20}$/.test(phone.trim())
}

export function validatePassword(password) {
  return password.length >= 8
}

/** Signup minimum — matches Supabase default (6) for low friction */
export function validatePasswordSignup(password) {
  return (password || '').length >= 6
}

export function validateLoginForm({ email, password }) {
  const errors = {}
  if (!validateEmail(email)) errors.email = 'Adresse email invalide'
  if (!password) errors.password = 'Mot de passe requis'
  return errors
}

export function validateSignupForm({ fullName, phone, email, password, password2 }) {
  const errors = {}
  if (!fullName.trim()) errors.fullName = 'Nom complet requis'
  if (!validatePhone(phone)) errors.phone = 'Numéro de téléphone invalide'
  if (!validateEmail(email)) errors.email = 'Adresse email invalide'
  if (!validatePassword(password)) errors.password = 'Minimum 8 caractères'
  if (password !== password2) errors.password2 = 'Les mots de passe ne correspondent pas'
  return errors
}

/** Simplified signup — no password confirmation (lower friction) */
export function validateSignupFormSimple({ fullName, phone, email, password }) {
  const errors = {}
  if (!fullName?.trim()) errors.fullName = 'Nom complet requis'
  if (!validatePhone(phone || '')) errors.phone = 'Numéro de téléphone invalide (ex: +212 6XX XXX XXX)'
  if (!validateEmail(email || '')) errors.email = 'Adresse email invalide'
  if (!validatePassword(password || '')) errors.password = 'Minimum 8 caractères requis'
  return errors
}

/** Ultra-low friction — email + password only; name/phone optional */
export function validateSignupFormMinimal({ fullName, phone, email, password }) {
  const errors = {}
  if (!validateEmail(email || '')) errors.email = 'Email invalide'
  if (!validatePasswordSignup(password)) errors.password = 'Minimum 6 caractères'
  if (fullName?.trim() && fullName.trim().length < 2) errors.fullName = 'Nom trop court'
  if (phone?.trim() && !validatePhone(phone)) errors.phone = 'Numéro invalide'
  return errors
}

export function validateForgotForm({ email }) {
  const errors = {}
  if (!validateEmail(email)) errors.email = 'Adresse email invalide'
  return errors
}

export function validateResetForm({ password, password2 }) {
  const errors = {}
  if (!validatePassword(password)) errors.password = 'Minimum 8 caractères'
  if (password !== password2) errors.password2 = 'Les mots de passe ne correspondent pas'
  return errors
}

export function validateProfileForm({ full_name, phone }) {
  const errors = {}
  if (!full_name?.trim()) errors.full_name = 'Nom complet requis'
  if (phone && !validatePhone(phone)) errors.phone = 'Numéro de téléphone invalide'
  return errors
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0
}

/** Map Supabase AuthApiError codes + messages → user-friendly French text */
export function parseAuthError(err) {
  const raw = err?.message || err?.error_description || ''
  const msg = raw.toLowerCase()
  const code = String(err?.code || err?.error_code || '').toLowerCase()
  const status = err?.status ?? err?.statusCode

  if (err?.code === 'AUTH_RATE_LIMIT_COOLDOWN') {
    return raw
  }

  // Supabase Auth API error codes (preferred over substring matching)
  if (code === 'user_already_exists' || code === 'email_exists') {
    return 'Cet email existe déjà — connectez-vous en un clic.'
  }
  if (code === 'invalid_credentials' || code === 'invalid_grant') {
    return 'Email ou mot de passe incorrect.'
  }
  if (code === 'weak_password' || code === 'password_too_weak') {
    return 'Mot de passe : 6 caractères minimum.'
  }
  if (code === 'email_not_confirmed') {
    return 'Compte créé mais email non confirmé. Désactivez la confirmation email dans Supabase (Auth → Email) ou confirmez votre boîte mail.'
  }
  if (code === 'signup_disabled' || code === 'email_provider_disabled') {
    return 'Inscription désactivée dans Supabase (Auth → Providers → Email).'
  }
  if (code === 'validation_failed' || code === 'email_address_invalid') {
    return 'Adresse email invalide.'
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
    const m = raw.match(/after\s+(\d+)\s+seconds?/i)
    if (m) {
      return `Limite Supabase : réessayez dans ${m[1]} secondes. Si le compte existe, utilisez Connexion.`
    }
    return 'Limite Supabase atteinte. Attendez 60 secondes, puis utilisez Connexion si le compte existe déjà.'
  }

  if (status === 401 || msg.includes('invalid api key') || msg.includes('invalid jwt') || msg.includes('malformed jwt')) {
    return 'Clé API ou URL Supabase incorrecte. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (projet ertdqfavrkomikszagtc).'
  }
  if (msg.includes('database error saving new user') || msg.includes('unexpected_failure')) {
    return 'Erreur SQL à l\'inscription (trigger profiles). Vérifiez handle_new_user() et la table profiles dans Supabase.'
  }
  if (msg.includes('error sending confirmation email') || msg.includes('confirmation email')) {
    return 'Supabase n\'a pas pu envoyer l\'email de confirmation. Désactivez « Confirm email » (Auth → Email) pour une session immédiate.'
  }
  if (msg.includes('hook') && msg.includes('failed')) {
    return 'Hook Auth échoué. Vérifiez les Auth Hooks dans le dashboard Supabase.'
  }
  if (msg.includes('redirect') && msg.includes('url')) {
    return 'URL de redirection non autorisée. Ajoutez localhost et votre domaine dans Auth → URL configuration.'
  }

  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Email ou mot de passe incorrect.'
  }
  if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already registered')) {
    return 'Cet email existe déjà — connectez-vous en un clic.'
  }
  if (msg.includes('password should be') || msg.includes('password is too weak')) {
    return 'Mot de passe : 6 caractères minimum.'
  }
  if (isAuthRateLimited(err)) {
    const m = raw.match(/after\s+(\d+)\s+seconds?/i)
    if (m) {
      return `Limite Supabase : réessayez dans ${m[1]} secondes. Si le compte existe, utilisez Connexion.`
    }
    return 'Limite Supabase atteinte. Attendez 60 secondes, puis utilisez Connexion si le compte existe déjà.'
  }
  if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Compte créé mais email non confirmé. Désactivez la confirmation email dans Supabase (Auth → Email) ou confirmez votre boîte mail.'
  }
  if (msg.includes('user not found')) return 'Aucun compte avec cet email. Créez un compte en quelques secondes.'
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Connexion instable. Vérifiez votre réseau, l\'URL Supabase et redémarrez `npm run dev` après changement du .env.'
  }
  if (msg.includes('signup is disabled') || msg.includes('signups not allowed')) {
    return 'Inscription temporairement indisponible. Activez Email provider dans Supabase.'
  }
  if (msg.includes('invalid email')) return 'Adresse email invalide.'

  return 'Impossible pour le moment. Réessayez dans un instant ou contactez-nous sur WhatsApp.'
}
