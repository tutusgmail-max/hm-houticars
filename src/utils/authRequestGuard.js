/**
 * Lightweight auth guard — dedupe in-flight requests only (no global cooldown queue).
 */

const inflightByKey = new Map()

export function normalizeAuthEmail(email) {
  return (email || '').trim().toLowerCase()
}

/** Used only to map Supabase 429 to a friendly message (does not block future attempts). */
export function isAuthRateLimited(err) {
  const status = err?.status ?? err?.statusCode
  if (status === 429) return true

  const code = String(err?.code || '').toLowerCase()
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || code === '429') {
    return true
  }

  const msg = (err?.message || err?.error_description || '').toLowerCase()
  return (
    msg.includes('rate limit exceeded')
    || msg.includes('over_request_rate_limit')
    || msg.includes('email rate limit exceeded')
    || msg.includes('too many requests')
    || msg.includes('for security purposes')
    || msg.includes('only request this after')
  )
}

/**
 * Same action+email while in-flight → same promise (anti double-click).
 * No serial queue, no client cooldown.
 */
export async function runAuthRequest(action, emailKey, fn) {
  const dedupeKey = `${action}:${normalizeAuthEmail(emailKey) || '_global'}`
  if (inflightByKey.has(dedupeKey)) {
    return inflightByKey.get(dedupeKey)
  }

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => {
      inflightByKey.delete(dedupeKey)
    })

  inflightByKey.set(dedupeKey, promise)
  return promise
}
