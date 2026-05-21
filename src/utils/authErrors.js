/**
 * Client-facing auth messages only (6 strings). Details → console.error via logAuthError.
 */
import { isAuthRateLimited } from './authRequestGuard'

export const AUTH_MESSAGES = {
  signupSuccess: 'Compte créé avec succès.',
  loginSuccess: 'Connexion réussie.',
  emailInUse: 'Email déjà utilisé.',
  invalidEmail: 'Adresse email invalide.',
  networkError: 'Erreur réseau.',
  retryLater: 'Réessayez plus tard.',
  passwordMin: 'Le mot de passe doit contenir au moins 6 caractères.',
}

function normalizeMsg(err) {
  return (err?.message || err?.error_description || '').toLowerCase()
}

function normalizeCode(err) {
  return String(err?.code || err?.error_code || '').toLowerCase()
}

export function isNetworkError(err) {
  if (!err) return false
  if (err.code === 'AUTH_TIMEOUT') return true
  const msg = normalizeMsg(err)
  const name = String(err?.name || '').toLowerCase()
  return (
    name === 'authtimeouterror'
    || msg.includes('failed to fetch')
    || msg.includes('network request failed')
    || msg.includes('network')
    || msg.includes('load failed')
    || msg.includes('cors')
    || msg.includes('timeout')
    || err?.status === 0
  )
}

export function isEmailAlreadyRegistered(err) {
  const code = normalizeCode(err)
  const msg = normalizeMsg(err)
  return (
    code === 'user_already_exists'
    || code === 'email_exists'
    || code === 'signup_email_already_exists'
    || msg.includes('already registered')
    || msg.includes('already been registered')
    || msg.includes('user already registered')
    || msg.includes('already exists')
  )
}

export function isInvalidEmailError(err) {
  const code = normalizeCode(err)
  const msg = normalizeMsg(err)
  return (
    code === 'email_address_invalid'
    || code === 'validation_failed'
    || msg.includes('invalid email')
    || msg.includes('unable to validate email')
  )
}

export function isObfuscatedExistingUser(user) {
  if (!user) return false
  const identities = user.identities
  return Array.isArray(identities) && identities.length === 0
}

export function parseAuthError(err) {
  if (!err) return AUTH_MESSAGES.networkError
  if (isEmailAlreadyRegistered(err)) return AUTH_MESSAGES.emailInUse
  if (isInvalidEmailError(err)) return AUTH_MESSAGES.invalidEmail
  if (err.code === 'weak_password' || err.code === 'password_too_weak') {
    return AUTH_MESSAGES.passwordMin
  }
  if (isAuthRateLimited(err)) return AUTH_MESSAGES.retryLater
  if (isNetworkError(err)) return AUTH_MESSAGES.networkError
  return AUTH_MESSAGES.retryLater
}
