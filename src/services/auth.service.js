/**
 * auth.service.js — Email + password only, deduped requests, fast timeout.
 */
import { supabase } from '../lib/supabase'
import { normalizeAuthEmail, runAuthRequest } from '../utils/authRequestGuard'
import { logAuthError } from '../utils/authDebug'
import { withAuthTimeout, AuthTimeoutError } from '../utils/authTimeout'
import { validateEmail, validatePasswordSignup } from '../utils/validation'

const AUTH_TIMEOUT_MS = 18_000

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
    withAuthTimeout(AUTH_TIMEOUT_MS, fn),
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
 * Signup — one request; auto sign-in if session missing (Confirm Email OFF).
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
      if (error) throw error

      if (data?.session) return data

      if (data?.user) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: pwd,
        })
        if (!signInErr && signInData?.session) {
          return { user: signInData.user, session: signInData.session }
        }
        return data
      }

      const empty = new Error('signup empty response')
      empty.code = 'SIGNUP_EMPTY'
      throw empty
    } catch (err) {
      if (err instanceof AuthTimeoutError) logAuthError('signUp.timeout', err)
      else logAuthError('signUp', err)
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
      logAuthError('signIn', err)
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
