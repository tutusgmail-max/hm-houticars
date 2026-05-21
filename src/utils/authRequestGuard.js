/**
 * Auth request guard — in-flight dedupe only (double-click / StrictMode).
 * No artificial cooldowns, retries, or post-error blocking.
 */

const inflight = new Map()
const completedAt = new Map()

/** Block rapid repeat of the same failed/successful auth action (anti-hammer, no server call) */
const MIN_REPEAT_MS = 2000

export function normalizeAuthEmail(email) {
  return (email || '').trim().toLowerCase()
}

/** True only for real Supabase / HTTP 429 rate-limit responses */
export function isAuthRateLimited(err) {
  const status = err?.status ?? err?.statusCode
  if (status === 429) return true

  const code = String(err?.code || '').toLowerCase()
  if (code === 'over_request_rate_limit' || code === '429') return true

  const msg = (err?.message || err?.error_description || '').toLowerCase()
  return (
    msg.includes('rate limit exceeded')
    || msg.includes('over_request_rate_limit')
    || msg.includes('email rate limit exceeded')
    || msg.includes('too many requests')
  )
}

/**
 * One in-flight request per action+email. Concurrent calls share the same promise.
 */
export async function runAuthRequest(action, emailKey, fn) {
  const key = `${action}:${normalizeAuthEmail(emailKey) || '_anonymous'}`

  if (inflight.has(key)) {
    return inflight.get(key)
  }

  const elapsed = Date.now() - (completedAt.get(key) || 0)
  if (elapsed < MIN_REPEAT_MS) {
    const err = new Error(`AUTH_DEDUPE: ${action} déjà envoyé — attendez ${Math.ceil((MIN_REPEAT_MS - elapsed) / 1000)}s`)
    err.code = 'AUTH_DEDUPE'
    throw err
  }

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => {
      completedAt.set(key, Date.now())
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}
