/**
 * Abort stalled Supabase Auth HTTP calls.
 */
const DEFAULT_AUTH_TIMEOUT_MS = 18_000

export class AuthTimeoutError extends Error {
  constructor() {
    super('Auth request timeout')
    this.name = 'AuthTimeoutError'
    this.code = 'AUTH_TIMEOUT'
  }
}

export function withAuthTimeout(ms, fn) {
  const limit = ms > 0 ? ms : DEFAULT_AUTH_TIMEOUT_MS
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new AuthTimeoutError()), limit)
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => clearTimeout(timer))
  })
}
