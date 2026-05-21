/**
 * validation.js
 * Pure validation functions — no side effects, fully testable.
 */

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
  const msg = err?.message || ''
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Cet email est déjà utilisé.'
  if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter.'
  if (msg.includes('Password should be')) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (msg.includes('rate limit')) return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (msg.includes('User not found')) return 'Aucun compte trouvé avec cet email.'
  if (msg.includes('network')) return 'Erreur réseau. Vérifiez votre connexion.'
  return msg || 'Une erreur inattendue est survenue.'
}
