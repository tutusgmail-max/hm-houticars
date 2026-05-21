/**
 * Auth debugging — verbose logs + raw UI messages in development only.
 * Set VITE_AUTH_DEBUG=true to force debug mode in production builds.
 */

export function isAuthDebug() {
  return import.meta.env.DEV === true || import.meta.env.VITE_AUTH_DEBUG === 'true'
}

/** Normalize Supabase AuthApiError / fetch errors for logging */
export function serializeAuthError(err) {
  if (!err) return { message: 'null error' }

  const status = err.status ?? err.statusCode ?? err?.context?.status ?? null
  const body =
    err?.context?.body ??
    err?.context?.data ??
    err?.data ??
    err?.error ??
    null

  return {
    message: err.message || err.error_description || String(err),
    code: err.code ?? err.error_code ?? null,
    status,
    name: err.name ?? null,
    body: typeof body === 'object' ? body : body ?? null,
    hint: err.hint ?? null,
    details: err.details ?? null,
    stack: isAuthDebug() ? err.stack : undefined,
  }
}

export function logAuthError(action, err) {
  if (!isAuthDebug()) return
  const info = serializeAuthError(err)
  console.groupCollapsed(`[Auth DEBUG] ${action}`)
  console.error('message:', info.message)
  console.error('code:', info.code)
  console.error('status:', info.status)
  if (info.body) console.error('response body:', info.body)
  if (info.hint) console.error('hint:', info.hint)
  if (info.details) console.error('details:', info.details)
  console.error('full error object:', err)
  console.groupEnd()
}

/**
 * UI message: in debug, always show raw Supabase text when mapper would hide it.
 */
export function formatAuthErrorForUi(err, mapper) {
  const mapped = mapper(err)
  if (!isAuthDebug()) return mapped

  const info = serializeAuthError(err)
  const generic =
    mapped === 'Impossible pour le moment. Réessayez dans un instant ou contactez-nous sur WhatsApp.'

  if (generic || !mapped) {
    const parts = [
      info.message,
      info.code ? `code=${info.code}` : null,
      info.status ? `HTTP ${info.status}` : null,
    ].filter(Boolean)
    return `[DEBUG] ${parts.join(' · ')}`
  }

  return `${mapped} — [${info.code || 'no-code'}${info.status ? ` HTTP ${info.status}` : ''}]`
}
