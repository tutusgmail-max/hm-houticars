/**
 * Client-side auth request guard — reduces duplicate Supabase calls
 * that trigger "too many attempts" / rate limits for legitimate users.
 */

const inflight = new Map()
const lastCallAt = {}

/** Minimum gap between identical auth actions (ms) */
export const AUTH_COOLDOWN_MS = {
  signIn: 1500,
  signUp: 2500,
  forgotPassword: 4000,
  resetPassword: 3000,
}

export function normalizeAuthEmail(email) {
  return (email || '').trim().toLowerCase()
}

export function isAuthRateLimited(err) {
  const msg = (err?.message || err?.error_description || '').toLowerCase()
  const status = err?.status || err?.code
  return (
    status === 429
    || msg.includes('rate limit')
    || msg.includes('too many')
    || msg.includes('too many requests')
    || msg.includes('over_request_rate_limit')
    || msg.includes('email rate limit')
  )
}

export function getAuthCooldownRemaining(action) {
  const gap = AUTH_COOLDOWN_MS[action] || 1500
  const last = lastCallAt[action] || 0
  return Math.max(0, gap - (Date.now() - last))
}

function assertCooldown(action) {
  const remaining = getAuthCooldownRemaining(action)
  if (remaining > 0) {
    const err = new Error('AUTH_COOLDOWN')
    err.code = 'AUTH_COOLDOWN'
    err.waitMs = remaining
    throw err
  }
  lastCallAt[action] = Date.now()
}

/**
 * Runs an auth API call with:
 * - per-action cooldown (blocks rapid double-submit)
 * - in-flight deduplication (same action reuses one promise)
 */
export async function runAuthRequest(action, key, fn) {
  assertCooldown(action)

  const dedupeKey = `${action}:${key}`
  if (inflight.has(dedupeKey)) return inflight.get(dedupeKey)

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => inflight.delete(dedupeKey))

  inflight.set(dedupeKey, promise)
  return promise
}

/** Suggested client wait after a server rate-limit (no automatic retry) */
export function getRateLimitWaitMs(err) {
  if (isAuthRateLimited(err)) return 60_000
  return 0
}
