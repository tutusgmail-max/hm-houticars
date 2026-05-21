/**
 * auth.service.js — all Supabase Auth HTTP goes through runAuthRequest (global queue).
 */
import { supabase } from '../lib/supabase'
import { normalizeAuthEmail, runAuthRequest } from '../utils/authRequestGuard'
import { logAuthError } from '../utils/authDebug'

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

/** Prefer listener session; only call when necessary */
export async function authGetSession() {
  return runAuthRequest('getSession', '_session', async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  })
}

export async function authGetUser() {
  return runAuthRequest('getUser', '_user', async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  })
}

export async function authSignUp({ email, password, fullName, phone }) {
  const normalizedEmail = normalizeAuthEmail(email)
  const displayName = (fullName || '').trim() || normalizedEmail.split('@')[0] || 'Client'
  const displayPhone = (phone || '').trim()

  return runAuthRequest('signUp', normalizedEmail, async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: displayName, phone: displayPhone },
        },
      })
      if (error) throw error
      return data
    } catch (err) {
      logAuthError('signUp', err)
      throw err
    }
  })
}

export async function authSignIn({ email, password }) {
  const normalizedEmail = normalizeAuthEmail(email)

  return runAuthRequest('signIn', normalizedEmail, async () => {
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
  return runAuthRequest('signOut', '_global', async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  })
}

export async function authForgotPassword(email) {
  const normalizedEmail = normalizeAuthEmail(email)

  return runAuthRequest('forgotPassword', normalizedEmail, async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  })
}

export async function authResetPassword(newPassword) {
  return runAuthRequest('resetPassword', 'session', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  })
}

export async function authChangePassword(newPassword) {
  return runAuthRequest('changePassword', 'change', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  })
}
