/**
 * Auth logging for developers — never shown in UI.
 */

export function serializeAuthError(err) {
  if (!err) return { message: 'null error' }

  const status = err.status ?? err.statusCode ?? err?.context?.status ?? null
  const body = err?.context?.body ?? err?.context?.data ?? err?.data ?? err?.error ?? null

  return {
    message: err.message || err.error_description || String(err),
    code: err.code ?? err.error_code ?? null,
    status,
    name: err.name ?? null,
    body: typeof body === 'object' ? body : body ?? null,
  }
}

/** Always log to console.error so devtools show the real Supabase error */
export function logAuthError(action, err, extra = null) {
  const info = serializeAuthError(err)
  console.error(`[Auth] ${action}`, info, extra ?? '', err)
}
