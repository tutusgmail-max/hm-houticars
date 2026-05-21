/**
 * auth.service.js
 * Single gateway for Supabase auth — prevents duplicate API calls.
 */
import { supabase } from '../lib/supabase'
import { normalizeAuthEmail, runAuthRequest } from '../utils/authRequestGuard'

// ── Singleton session bootstrap (StrictMode-safe) ───────────────────────────
let sessionBootstrapPromise = null

export async function authGetSession() {
  if (!sessionBootstrapPromise) {
    sessionBootstrapPromise = supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) throw error
      return session
    })
  }
  return sessionBootstrapPromise
}

// ── Singleton auth state listener (one subscription for entire app) ─────────
const authSubscribers = new Set()
let authSubscription = null

export function authOnChange(callback) {
  authSubscribers.add(callback)

  if (!authSubscription) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authSubscribers.forEach((cb) => {
        try { cb(event, session) } catch (e) { console.warn('[authOnChange]', e) }
      })
    })
    authSubscription = subscription
  }

  return {
    unsubscribe: () => {
      authSubscribers.delete(callback)
    },
  }
}

// ── Sign Up (single signUp call — no follow-up signIn) ───────────────────────
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
    if (error) throw error

    if (data.user) {
      supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: displayName,
        phone: displayPhone,
        email: normalizedEmail,
        role: 'client',
      }, { onConflict: 'id' }).then(({ error: profileError }) => {
        if (profileError) console.warn('[authSignUp] profile upsert:', profileError.message)
      })
    }

    return data
  })
}

// ── Sign In ──────────────────────────────────────────────────────────────────
export async function authSignIn({ email, password }) {
  const normalizedEmail = normalizeAuthEmail(email)

  return runAuthRequest('signIn', normalizedEmail, async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    if (error) throw error
    return data
  })
}

// ── Sign Out ─────────────────────────────────────────────────────────────────
export async function authSignOut() {
  sessionBootstrapPromise = null
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Forgot Password ──────────────────────────────────────────────────────────
export async function authForgotPassword(email) {
  const normalizedEmail = normalizeAuthEmail(email)

  return runAuthRequest('forgotPassword', normalizedEmail, async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  })
}

// ── Reset Password ───────────────────────────────────────────────────────────
export async function authResetPassword(newPassword) {
  return runAuthRequest('resetPassword', 'session', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  })
}

export async function authChangePassword(newPassword) {
  return runAuthRequest('resetPassword', 'change', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  })
}
