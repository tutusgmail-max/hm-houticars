/**
 * Minimal auth guard — dedupe in-flight calls only (no client cooldowns).
 * Prevents double-submit duplicate Supabase requests without blocking real users.
 */

const inflight = new Map()

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

/**
 * Reuses the same in-flight promise for identical action+key (e.g. double-click).
 */
export async function runAuthRequest(action, key, fn) {
  const dedupeKey = `${action}:${key}`
  if (inflight.has(dedupeKey)) return inflight.get(dedupeKey)

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => inflight.delete(dedupeKey))

  inflight.set(dedupeKey, promise)
  return promise
}
