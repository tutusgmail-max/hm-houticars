/**
 * Production-safe auth error messages (French). No technical / debug text.
 */
import { isAuthRateLimited, getAuthCooldownRemainingMs } from './authRequestGuard'

export const AUTH_MESSAGES = {
  emailInUse: 'Cet email est déjà utilisé.',
  invalidEmail: 'Adresse email invalide.',
  weakPassword: 'Mot de passe : 6 caractères minimum.',
  invalidCredentials: 'Email ou mot de passe incorrect.',
  serverError: 'Une erreur est survenue. Réessayez plus tard.',
  signupSuccess: 'Compte créé avec succès.',
  loginSuccess: 'Connexion réussie.',
  rateLimit: (seconds) =>
    `Trop de tentatives. Réessayez dans ${seconds} seconde${seconds > 1 ? 's' : ''}.`,
  signupConfirmLogin: 'Compte créé avec succès. Connectez-vous pour continuer.',
}

function normalizeMsg(err) {
  return (err?.message || err?.error_description || '').toLowerCase()
}

function normalizeCode(err) {
  return String(err?.code || err?.error_code || '').toLowerCase()
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

  if (err.code === 'AUTH_RATE_LIMIT_COOLDOWN') {
    const sec = Math.max(1, Math.ceil(getAuthCooldownRemainingMs() / 1000))
    return AUTH_MESSAGES.rateLimit(sec)
  }

  if (isEmailAlreadyRegistered(err)) return AUTH_MESSAGES.emailInUse
  if (isInvalidEmailError(err)) return AUTH_MESSAGES.invalidEmail

  const code = normalizeCode(err)
  const msg = normalizeMsg(err)

  if (code === 'invalid_credentials' || code === 'invalid_grant') {
    return AUTH_MESSAGES.invalidCredentials
  }
  if (code === 'weak_password' || code === 'password_too_weak' || msg.includes('password')) {
    return AUTH_MESSAGES.weakPassword
  }
  if (isAuthRateLimited(err)) {
    const m = (err?.message || '').match(/after\s+(\d+)\s+seconds?/i)
    const sec = m ? Math.max(1, parseInt(m[1], 10)) : 60
    return AUTH_MESSAGES.rateLimit(sec)
  }

  return AUTH_MESSAGES.serverError
}
