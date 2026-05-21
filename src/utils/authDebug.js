/**
 * Developer-only auth logging. Never surfaces technical details in the UI.
 */

function serializeAuthError(err) {
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

/** Logs to console.error in development only — never shown to end users */
export function logAuthError(action, err) {
  if (!import.meta.env.DEV) return
  const info = serializeAuthError(err)
  console.error(`[Auth] ${action}`, info, err)
}
