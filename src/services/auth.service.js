/**
 * auth.service.js — single Supabase client, single auth listener, guarded signUp.
 */
import { supabase } from '../lib/supabase'
import { normalizeAuthEmail, runAuthRequest } from '../utils/authRequestGuard'

const AUTH_DEBUG = import.meta.env.DEV

function logAuthError(step, error) {
  if (!AUTH_DEBUG) return
  console.warn(`[auth] ${step}`, error?.message || error)
}

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

export async function authGetSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

/** Sign up — one HTTP call per submit; no chained signIn */
export async function authSignUp({ email, password, fullName, phone }) {
  const normalizedEmail = normalizeAuthEmail(email)
  const displayName = (fullName || '').trim() || normalizedEmail.split('@')[0] || 'Client'
  const displayPhone = (phone || '').trim()

  return runAuthRequest('signUp', normalizedEmail, async () => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: displayName, phone: displayPhone },
      },
    })
    if (error) {
      logAuthError('signUp', error)
      throw error
    }
    return data
  })
}

export async function authSignIn({ email, password }) {
  const normalizedEmail = normalizeAuthEmail(email)

  return runAuthRequest('signIn', normalizedEmail, async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    if (error) {
      logAuthError('signIn', error)
      throw error
    }
    return data
  })
}

export async function authSignOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    logAuthError('signOut', error)
    throw error
  }
}

export async function authForgotPassword(email) {
  const normalizedEmail = normalizeAuthEmail(email)

  return runAuthRequest('forgotPassword', normalizedEmail, async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      logAuthError('forgotPassword', error)
      throw error
    }
  })
}

export async function authResetPassword(newPassword) {
  return runAuthRequest('resetPassword', 'session', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      logAuthError('resetPassword', error)
      throw error
    }
  })
}

export async function authChangePassword(newPassword) {
  return runAuthRequest('changePassword', 'change', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      logAuthError('changePassword', error)
      throw error
    }
  })
}
