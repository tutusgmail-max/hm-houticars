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

/** Map Supabase error messages → user-friendly French text */
export function parseAuthError(err) {
  if (err?.code === 'AUTH_COOLDOWN') {
    const sec = Math.ceil((err.waitMs || 1500) / 1000)
    return `Un instant… Réessayez dans ${sec} seconde${sec > 1 ? 's' : ''}.`
  }

  const msg = (err?.message || err?.error_description || '').toLowerCase()

  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Email ou mot de passe incorrect. Vérifiez vos identifiants.'
  }
  if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already registered')) {
    return 'Cet email est déjà utilisé. Connectez-vous avec ce compte.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Compte trouvé — reconnectez-vous pour continuer.'
  }
  if (msg.includes('password should be') || msg.includes('password is too weak')) {
    return 'Choisissez un mot de passe d’au moins 8 caractères.'
  }
  if (isAuthRateLimited(err)) {
    return 'Beaucoup de demandes en peu de temps. Patientez 1 à 2 minutes, puis réessayez une seule fois.'
  }
  if (msg.includes('user not found')) return 'Aucun compte avec cet email. Créez un compte en quelques secondes.'
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Connexion instable. Vérifiez votre réseau et réessayez.'
  }
  if (msg.includes('signup is disabled')) return 'Inscription temporairement indisponible. Contactez-nous sur WhatsApp.'
  if (msg.includes('invalid email')) return 'Adresse email invalide.'

  const raw = err?.message || ''
  if (!raw || raw.length > 120) return 'Une petite erreur est survenue. Réessayez calmement.'
  return raw
}
