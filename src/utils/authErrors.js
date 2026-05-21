/**
 * Client-facing auth messages (French). Technical details only in console.error.
 */
import { isAuthRateLimited } from './authRequestGuard'

export const AUTH_MESSAGES = {
  signupSuccess: 'Compte créé avec succès.',
  loginSuccess: 'Connexion réussie.',
  emailInUse: 'Email déjà utilisé.',
  invalidEmail: 'Adresse email invalide.',
  connectionError: 'Erreur de connexion.',
  retryLater: 'Réessayez dans quelques secondes.',
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
    code === 'validation_failed'
    || code === 'email_address_invalid'
    || msg.includes('invalid email')
    || msg.includes('unable to validate email')
  )
}

function isSignupDisabled(err) {
  const msg = normalizeMsg(err)
  const code = normalizeCode(err)
  return code === 'signup_disabled' || msg.includes('signup is disabled') || msg.includes('signups not allowed')
}

function isDatabaseSignupError(err) {
  const msg = normalizeMsg(err)
  return msg.includes('database error saving new user') || msg.includes('unexpected_failure')
}

function isInvalidApiKey(err) {
  const msg = normalizeMsg(err)
  const status = err?.status ?? err?.statusCode
  return status === 401 || msg.includes('invalid api key') || msg.includes('invalid jwt') || msg.includes('malformed jwt')
}

/** Detect Supabase obfuscated user (existing email, no identities) */
export function isObfuscatedExistingUser(user) {
  if (!user) return false
  const identities = user.identities
  return Array.isArray(identities) && identities.length === 0
}

/** Map errors to simple user messages (no technical details). */
export function parseAuthError(err) {
  if (!err) return AUTH_MESSAGES.connectionError

  if (isEmailAlreadyRegistered(err)) return AUTH_MESSAGES.emailInUse
  if (isInvalidEmailError(err)) return AUTH_MESSAGES.invalidEmail
  if (err.code === 'weak_password' || err.code === 'password_too_weak') {
    return AUTH_MESSAGES.passwordMin
  }
  if (isAuthRateLimited(err)) return AUTH_MESSAGES.retryLater
  if (isNetworkError(err)) return AUTH_MESSAGES.connectionError
  if (isSignupDisabled(err) || isDatabaseSignupError(err) || isInvalidApiKey(err)) {
    return AUTH_MESSAGES.retryLater
  }

  return AUTH_MESSAGES.connectionError
}
