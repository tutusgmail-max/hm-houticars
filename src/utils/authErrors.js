/**
 * Production-safe auth error messages (French). No technical / debug text.
 */
import { isAuthRateLimited } from './authRequestGuard'

export const AUTH_MESSAGES = {
  emailInUse: 'Cet email est déjà utilisé.',
  invalidEmail: 'Adresse email invalide.',
  weakPassword: 'Le mot de passe doit contenir au moins 6 caractères.',
  invalidCredentials: 'Email ou mot de passe incorrect.',
  serverError: 'Une erreur est survenue.',
  networkError: 'Problème de connexion.',
  rateLimit: 'Trop de tentatives. Réessayez dans quelques minutes.',
  signupSuccess: 'Compte créé avec succès.',
  loginSuccess: 'Connexion réussie.',
  signupConfirmLogin: 'Compte créé avec succès. Connectez-vous pour continuer.',
  signupTooFast: 'Veuillez patienter quelques secondes avant de réessayer.',
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

/** Map any Supabase Auth error to a client-safe French message */
export function parseAuthError(err) {
  if (!err) return AUTH_MESSAGES.serverError

  if (err.code === 'AUTH_RATE_LIMIT_COOLDOWN' || err.code === 'AUTH_SIGNUP_TOO_FAST') {
    return AUTH_MESSAGES.rateLimit
  }

  if (isNetworkError(err)) return AUTH_MESSAGES.networkError
  if (isEmailAlreadyRegistered(err)) return AUTH_MESSAGES.emailInUse
  if (isInvalidEmailError(err)) return AUTH_MESSAGES.invalidEmail

  const code = normalizeCode(err)

  if (code === 'invalid_credentials' || code === 'invalid_grant') {
    return AUTH_MESSAGES.invalidCredentials
  }
  if (code === 'weak_password' || code === 'password_too_weak') {
    return AUTH_MESSAGES.weakPassword
  }
  if (isAuthRateLimited(err)) return AUTH_MESSAGES.rateLimit

  return AUTH_MESSAGES.serverError
}
