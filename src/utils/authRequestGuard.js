/**
 * Auth request guard — ONE Supabase auth HTTP call per user action.
 * - In-flight dedupe (double-click / StrictMode)
 * - Per-email global lock (no signUp + signIn overlap)
 * - Short post-success gap (1s) to stop accidental rapid re-submit
 */

const inflight = new Map()
const emailInflight = new Map()
const lastCompletedAt = new Map()

/** Minimum ms between two completed requests for the same action+email */
const MIN_GAP_MS = 1000

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

export function isAuthThrottleError(err) {
  return err?.code === 'AUTH_THROTTLE'
}

/**
 * Runs a single auth API call per action+email. Concurrent attempts reuse the same promise.
 */
export async function runAuthRequest(action, emailKey, fn) {
  const key = normalizeAuthEmail(emailKey) || '_anonymous'
  const dedupeKey = `${action}:${key}`

  if (inflight.has(dedupeKey)) return inflight.get(dedupeKey)
  if (emailInflight.has(key)) return emailInflight.get(key)

  const since = Date.now() - (lastCompletedAt.get(dedupeKey) || 0)
  if (since < MIN_GAP_MS) {
    const err = new Error('AUTH_THROTTLE')
    err.code = 'AUTH_THROTTLE'
    err.waitMs = MIN_GAP_MS - since
    throw err
  }

  const promise = (async () => {
    try {
      return await fn()
    } finally {
      lastCompletedAt.set(dedupeKey, Date.now())
      inflight.delete(dedupeKey)
      emailInflight.delete(key)
    }
  })()

  inflight.set(dedupeKey, promise)
  emailInflight.set(key, promise)
  return promise
}

/** After rate-limit error, avoid immediate hammering (client-side only) */
export function markAuthRateLimited(emailKey) {
  const key = normalizeAuthEmail(emailKey) || '_anonymous'
  for (const action of ['signIn', 'signUp', 'forgotPassword']) {
    lastCompletedAt.set(`${action}:${key}`, Date.now() + 20_000)
  }
}
