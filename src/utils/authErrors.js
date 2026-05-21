/**
 * Client-facing auth messages only (4 simple strings + field validation).
 */
import { isAuthRateLimited } from './authRequestGuard'

export const AUTH_MESSAGES = {
  signupSuccess: 'Compte créé avec succès.',
  loginSuccess: 'Connexion réussie.',
  emailInUse: 'Email déjà utilisé.',
  connectionError: 'Erreur de connexion.',
  passwordMin: 'Le mot de passe doit contenir au moins 6 caractères.',
  invalidEmail: 'Adresse email invalide.',
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
    || msg.includes('network')
    || msg.includes('load failed')
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
    code === 'validation_failed'
    || code === 'email_address_invalid'
    || msg.includes('invalid email')
    || msg.includes('unable to validate email')
  )
}

/** Map errors to simple user messages (no technical details). */
export function parseAuthError(err) {
  if (!err) return AUTH_MESSAGES.connectionError
  if (isEmailAlreadyRegistered(err)) return AUTH_MESSAGES.emailInUse
  if (isInvalidEmailError(err)) return AUTH_MESSAGES.invalidEmail
  if (err.code === 'weak_password' || err.code === 'password_too_weak') {
    return AUTH_MESSAGES.passwordMin
  }
  return AUTH_MESSAGES.connectionError
}
