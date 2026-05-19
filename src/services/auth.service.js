/**
 * auth.service.js
 * Clean service layer wrapping Supabase auth calls.
 * Components never import supabase directly — only this module.
 */
import { supabase } from '../lib/supabase'

// ── Sign Up ─────────────────────────────────────────────────────────────────
export async function authSignUp({ email, password, fullName, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
    },
  })
  if (error) throw error

  // Upsert profile row immediately (DB trigger also does this as fallback)
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      phone,
      email,
      role: 'client',
    }, { onConflict: 'id' })
    if (profileError) {
      console.warn('[authSignUp] profile upsert:', profileError.message)
    }
  }
  return data
}

// ── Sign In ──────────────────────────────────────────────────────────────────
export async function authSignIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// ── Sign Out ─────────────────────────────────────────────────────────────────
export async function authSignOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Forgot Password ──────────────────────────────────────────────────────────
export async function authForgotPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

// ── Reset Password (from email link) ─────────────────────────────────────────
export async function authResetPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ── Change Password (authenticated) ──────────────────────────────────────────
export async function authChangePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
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
