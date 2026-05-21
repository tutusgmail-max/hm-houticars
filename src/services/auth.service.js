/**
 * auth.service.js — Email + password signup (single request, robust error handling).
 */
import { supabase, getSupabasePublicConfig } from '../lib/supabase'
import { normalizeAuthEmail, runAuthRequest } from '../utils/authRequestGuard'
import { logAuthError, serializeAuthError } from '../utils/authDebug'
import { withAuthTimeout, AuthTimeoutError } from '../utils/authTimeout'
import { withNetworkRetry } from '../utils/authRetry'
import {
  isObfuscatedExistingUser,
  isEmailAlreadyRegistered,
} from '../utils/authErrors'
import { validateEmail, validatePasswordSignup } from '../utils/validation'

const AUTH_TIMEOUT_MS = 22_000

let authSubscription = null
let authListenerCallback = null

export function authOnChange(callback) {
  authListenerCallback = callback

  if (!authSubscription) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authListenerCallback?.(event, session)
    })
    authSubscription = subscription
  }

  return {
    unsubscribe: () => {
      if (authListenerCallback === callback) {
        authListenerCallback = null
      }
    },
  }
}

async function runTimedAuth(action, emailKey, fn) {
  return runAuthRequest(action, emailKey, () =>
    withAuthTimeout(AUTH_TIMEOUT_MS, () => withNetworkRetry(fn)),
  )
}

export async function authGetSession() {
  return runTimedAuth('getSession', '_session', async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  })
}

export async function authGetUser() {
  return runTimedAuth('getUser', '_user', async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  })
}

/**
 * Signup — ONE signUp call to Supabase (no chained signIn → avoids false "connection" errors).
 */
export async function authSignUp({ email, password, fullName, phone }) {
  const normalizedEmail = normalizeAuthEmail(email)
  const pwd = (password || '').trim()

  if (!validateEmail(normalizedEmail)) {
    const err = new Error('invalid email')
    err.code = 'email_address_invalid'
    throw err
  }
  if (!validatePasswordSignup(pwd)) {
    const err = new Error('weak password')
    err.code = 'weak_password'
    throw err
  }

  const displayName = (fullName || '').trim() || normalizedEmail.split('@')[0] || 'Client'
  const displayPhone = (phone || '').trim()

  return runTimedAuth('signUp', normalizedEmail, async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: pwd,
        options: {
          data: { full_name: displayName, phone: displayPhone },
        },
      })

      if (import.meta.env.DEV) {
        console.error('[Auth] signUp.response', {
          config: getSupabasePublicConfig(),
          error: error ? serializeAuthError(error) : null,
          hasUser: !!data?.user,
          hasSession: !!data?.session,
          identities: data?.user?.identities?.length ?? null,
        })
      }

      if (error) throw error

      if (!data?.user && !data?.session) {
        const empty = new Error('signup empty response')
        empty.code = 'SIGNUP_EMPTY'
        throw empty
      }

      if (data.user && isObfuscatedExistingUser(data.user)) {
        const exists = new Error('User already registered')
        exists.code = 'user_already_exists'
        throw exists
      }

      return data
    } catch (err) {
      if (isEmailAlreadyRegistered(err)) throw err
      if (err instanceof AuthTimeoutError) {
        logAuthError('signUp.timeout', err, { config: getSupabasePublicConfig() })
        throw err
      }
      logAuthError('signUp', err, { config: getSupabasePublicConfig() })
      throw err
    }
  })
}

export async function authSignIn({ email, password }) {
  const normalizedEmail = normalizeAuthEmail(email)

  return runTimedAuth('signIn', normalizedEmail, async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      if (error) throw error
      return data
    } catch (err) {
      logAuthError('signIn', err, { config: getSupabasePublicConfig() })
      throw err
    }
  })
}

export async function authSignOut() {
  return runTimedAuth('signOut', '_global', async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  })
}

export async function authForgotPassword(email) {
  const normalizedEmail = normalizeAuthEmail(email)

  return runTimedAuth('forgotPassword', normalizedEmail, async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  })
}

export async function authResetPassword(newPassword) {
  return runTimedAuth('resetPassword', 'session', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  })
}

export async function authChangePassword(newPassword) {
  return runTimedAuth('changePassword', 'change', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  })
}

/** DevTools / smoke test — ping Supabase Auth settings */
export async function pingSupabaseAuth() {
  try {
    const { data, error } = await supabase.auth.getSession()
    return { ok: !error, error: error?.message ?? null, hasSession: !!data?.session }
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) }
  }
}
