/**
 * Parse Supabase auth hash fragments (#access_token=...&type=recovery).
 */

export function getAuthHashParams() {
  if (typeof window === 'undefined') return {}
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return {}
  try {
    return Object.fromEntries(new URLSearchParams(raw))
  } catch {
    return {}
  }
}

export function hasAuthHashInUrl() {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash
  return hash.includes('access_token') || hash.includes('error=') || hash.includes('type=')
}

export function isRecoveryHash() {
  const params = getAuthHashParams()
  return params.type === 'recovery'
}

export function isEmailConfirmHash() {
  const params = getAuthHashParams()
  return params.type === 'signup' || params.type === 'email' || params.type === 'invite'
}

/** Remove OAuth/recovery tokens from the address bar after session is established. */
export function clearAuthHashFromUrl() {
  if (typeof window === 'undefined') return
  const { pathname, search } = window.location
  window.history.replaceState(window.history.state, '', pathname + search)
}

/** Apply #access_token hash to Supabase session (explicit, route-safe). */
export async function consumeAuthHashFromUrl(supabaseClient) {
  const params = getAuthHashParams()
  const access_token = params.access_token
  const refresh_token = params.refresh_token
  if (!access_token || !refresh_token) return { ok: false, reason: 'missing_tokens' }

  const { error } = await supabaseClient.auth.setSession({ access_token, refresh_token })
  if (error) return { ok: false, reason: error.message }

  clearAuthHashFromUrl()
  return { ok: true, type: params.type || null }
}
