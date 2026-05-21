/**
 * Client-facing auth messages. Real Supabase details → console.error via logAuthError.
 */
import { isAuthRateLimited } from './authRequestGuard'

export const AUTH_MESSAGES = {
  signupSuccess: 'Compte créé avec succès.',
  loginSuccess: 'Connexion réussie.',
  emailInUse: 'Email déjà utilisé.',
  invalidEmail: 'Adresse email invalide.',
  networkError: 'Erreur réseau.',
  rateLimit: 'Limite de requêtes atteinte. Patientez une minute.',
  retryLater: 'Réessayez plus tard.',
  passwordMin: 'Le mot de passe doit contenir au moins 6 caractères.',
  invalidCredentials: 'Email ou mot de passe incorrect.',
}

function normalizeMsg(err) {
  return (err?.message || err?.error_description || '').toLowerCase()
}

function normalizeCode(err) {
  return String(err?.code || err?.error_code || '').toLowerCase()
}

export function isNetworkError(err) {
  if (!err) return false
  if (err.code === 'AUTH_TIMEOUT' || err.code === 'SIGNUP_EMPTY') return true
  const msg = normalizeMsg(err)
  const name = String(err?.name || '').toLowerCase()
  return (
    name === 'authtimeouterror'
    || name === 'authretryablefetcherror'
    || msg.includes('failed to fetch')
    || msg.includes('network request failed')
    || msg.includes('network')
    || msg.includes('load failed')
    || msg.includes('cors')
    || msg.includes('timeout')
    || msg.includes('aborted')
    || err?.status === 0
  )
}

export function isSupabaseConfigError(err) {
  const code = normalizeCode(err)
  return code === 'supabase_config' || code === 'supabase_config_invalid'
}

export function isInvalidApiKeyError(err) {
  const status = err?.status ?? err?.statusCode
  const msg = normalizeMsg(err)
  const code = normalizeCode(err)
  return (
    status === 401
    || code === 'no_authorization'
    || msg.includes('invalid api key')
    || msg.includes('invalid jwt')
    || msg.includes('apikey')
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
    || msg.includes('invalid format')
  )
}

export function isInvalidCredentialsError(err) {
  const code = normalizeCode(err)
  const msg = normalizeMsg(err)
  return (
    code === 'invalid_credentials'
    || code === 'invalid_grant'
    || msg.includes('invalid login credentials')
    || msg.includes('invalid email or password')
  )
}

export function isDatabaseUserSaveError(err) {
  const msg = normalizeMsg(err)
  const code = normalizeCode(err)
  return (
    msg.includes('database error saving new user')
    || code === 'unexpected_failure'
    || msg.includes('error saving new user')
  )
}

export function isSignupDisabledError(err) {
  const code = normalizeCode(err)
  const msg = normalizeMsg(err)
  return code === 'signup_disabled' || msg.includes('signups not allowed')
}

export function isServerError(err) {
  const status = err?.status ?? err?.statusCode
  return typeof status === 'number' && status >= 500 && status < 600
}

/**
 * Supabase may return 200 + user with empty identities when email already exists (anti-enumeration).
 * Only treat as duplicate when identities is explicitly an empty array (not undefined).
 */
export function isObfuscatedExistingUser(user) {
  if (!user) return false
  const identities = user.identities
  return Array.isArray(identities) && identities.length === 0
}

export function parseAuthError(err) {
  if (!err) return AUTH_MESSAGES.networkError

  if (isSupabaseConfigError(err) || isInvalidApiKeyError(err)) {
    return AUTH_MESSAGES.networkError
  }
  if (isEmailAlreadyRegistered(err)) return AUTH_MESSAGES.emailInUse
  if (isInvalidEmailError(err)) return AUTH_MESSAGES.invalidEmail
  if (isInvalidCredentialsError(err)) return AUTH_MESSAGES.invalidCredentials
  if (err.code === 'weak_password' || err.code === 'password_too_weak') {
    return AUTH_MESSAGES.passwordMin
  }
  if (isAuthRateLimited(err)) return AUTH_MESSAGES.rateLimit
  if (isSignupDisabledError(err)) return AUTH_MESSAGES.retryLater
  if (isDatabaseUserSaveError(err)) return AUTH_MESSAGES.retryLater
  if (isServerError(err)) return AUTH_MESSAGES.retryLater
  if (isNetworkError(err)) return AUTH_MESSAGES.networkError

  return AUTH_MESSAGES.networkError
}
