/**
 * Supabase env resolution for Vite (import.meta.env).
 * VITE_* from .env / Vercel dashboard take precedence; production builds
 * fall back to the live project when vars are missing at build time.
 */

const PRODUCTION_SUPABASE_URL = 'https://ertdqfavrkomikszagtc.supabase.co'
const PRODUCTION_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydGRxZmF2cmtvbWlrc3phZ3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTYwNzgsImV4cCI6MjA5NDU5MjA3OH0.w49Qp4uI0nAOyNS0QoBo7y3HsAnF70jFm4NLwSjiCVg'

function trimEnv(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isLocalhostUrl(url) {
  if (!url) return false
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host === '127.0.0.1'
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url)
  }
}

/**
 * @returns {{ url: string, anonKey: string, source: 'env' | 'production-default' | 'missing' }}
 */
export function resolveSupabaseEnv() {
  const envUrl = trimEnv(import.meta.env.VITE_SUPABASE_URL)
  const envKey = trimEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

  if (envUrl && envKey && !isLocalhostUrl(envUrl)) {
    return { url: envUrl, anonKey: envKey, source: 'env' }
  }

  if (import.meta.env.PROD) {
    return {
      url: PRODUCTION_SUPABASE_URL,
      anonKey: PRODUCTION_SUPABASE_ANON_KEY,
      source: 'production-default',
    }
  }

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey, source: 'env' }
  }

  return { url: '', anonKey: '', source: 'missing' }
}

export function assertSupabaseEnvConfigured() {
  const { url, anonKey, source } = resolveSupabaseEnv()
  if (url && anonKey) return { url, anonKey, source }

  throw new Error(
    'Missing Supabase environment variables. Copy `.env.example` to `.env` and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}
