/**
 * Resolve admin role from profiles row + Supabase Auth metadata.
 */
export function getMetadataRole(sessionUser) {
  if (!sessionUser) return null
  const raw =
    sessionUser.user_metadata?.role
    ?? sessionUser.app_metadata?.role
    ?? null
  return typeof raw === 'string' ? raw.trim().toLowerCase() : null
}

export function resolveEffectiveRole(profile, sessionUser) {
  const profileRole = (profile?.role || '').trim().toLowerCase()
  const metaRole = getMetadataRole(sessionUser)

  if (profileRole === 'admin' || metaRole === 'admin') return 'admin'
  if (profileRole) return profileRole
  if (metaRole) return metaRole
  return 'client'
}

export function isAdminRole(profile, sessionUser) {
  return resolveEffectiveRole(profile, sessionUser) === 'admin'
}
