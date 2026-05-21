/**
 * auth.service.js
 * Clean service layer wrapping Supabase auth calls.
 * Components never import supabase directly — only this module.
 */
import { supabase } from '../lib/supabase'
import { normalizeAuthEmail, runAuthRequest } from '../utils/authRequestGuard'

// ── Sign Up ─────────────────────────────────────────────────────────────────
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
        // Supabase dashboard: disable "Confirm email" for instant session
      },
    })
    if (error) throw error

    // Upsert profile row immediately (DB trigger also does this as fallback)
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: displayName,
        phone: displayPhone,
        email: normalizedEmail,
        role: 'client',
      }, { onConflict: 'id' })
      if (profileError) {
        console.warn('[authSignUp] profile upsert:', profileError.message)
      }
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

// ── Reset Password (from email link) ─────────────────────────────────────────
export async function authResetPassword(newPassword) {
  return runAuthRequest('resetPassword', 'session', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  })
}

// ── Change Password (authenticated) ──────────────────────────────────────────
export async function authChangePassword(newPassword) {
  return runAuthRequest('resetPassword', 'change', async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  })
}

// ── Get current session ───────────────────────────────────────────────────────
export async function authGetSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

// ── Subscribe to auth changes ─────────────────────────────────────────────────
export function authOnChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return subscription
}
