/**
 * Central auth request gate — ONE Supabase auth HTTP operation at a time.
 * No automatic retries. 429 sets a cooldown; duplicates are rejected or coalesced.
 */

const inflightByKey = new Map()
let queueTail = Promise.resolve()
let rateLimitedUntil = 0

export function normalizeAuthEmail(email) {
  return (email || '').trim().toLowerCase()
}

function parseCooldownSeconds(err) {
  const msg = err?.message || ''
  const m = msg.match(/after\s+(\d+)\s+seconds?/i)
  if (m) return Math.min(120, Math.max(1, parseInt(m[1], 10)))
  return 60
}

/** Called when Supabase returns a rate-limit error — blocks further auth HTTP until cooldown ends */
export function markAuthRateLimitedFromError(err) {
  if (!isAuthRateLimited(err)) return
  const sec = parseCooldownSeconds(err)
  rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + sec * 1000)
}

export function isAuthGloballyBlocked() {
  return Date.now() < rateLimitedUntil
}

export function getAuthCooldownRemainingMs() {
  return Math.max(0, rateLimitedUntil - Date.now())
}

export function getAuthBlockedMessage() {
  const sec = Math.max(1, Math.ceil(getAuthCooldownRemainingMs() / 1000))
  return `Limite de sécurité Supabase. Réessayez dans ${sec} s (ou utilisez Connexion si le compte existe déjà).`
}

export function isAuthRateLimited(err) {
  if (err?.code === 'AUTH_RATE_LIMIT_COOLDOWN') return true

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
    || msg.includes('for security purposes')
    || msg.includes('only request this after')
  )
}

function rejectIfBlocked() {
  if (!isAuthGloballyBlocked()) return
  const err = new Error(getAuthBlockedMessage())
  err.code = 'AUTH_RATE_LIMIT_COOLDOWN'
  throw err
}

/**
 * Queue exactly one auth HTTP call at a time across the whole app.
 * Same action+email while in-flight returns the same promise (no duplicate HTTP).
 */
export async function runAuthRequest(action, emailKey, fn) {
  rejectIfBlocked()

  const dedupeKey = `${action}:${normalizeAuthEmail(emailKey) || '_global'}`
  if (inflightByKey.has(dedupeKey)) {
    return inflightByKey.get(dedupeKey)
  }

  const task = queueTail.then(async () => {
    rejectIfBlocked()
    try {
      return await fn()
    } catch (err) {
      markAuthRateLimitedFromError(err)
      throw err
    }
  })

  queueTail = task.catch(() => {})

  const tracked = task.finally(() => {
    inflightByKey.delete(dedupeKey)
  })

  inflightByKey.set(dedupeKey, tracked)
  return tracked
}
