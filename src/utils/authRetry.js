import { isNetworkError } from './authErrors'
import { AuthTimeoutError } from './authTimeout'

/** One retry for transient network failures only */
export async function withNetworkRetry(fn, { retries = 1, delayMs = 800 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const retryable =
        err instanceof AuthTimeoutError
        || isNetworkError(err)
      if (!retryable || attempt >= retries) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw lastErr
}
