/**
 * Resolve admin role from profiles row + Supabase Auth metadata.
 * Source of truth for app access: profiles.role, with metadata sync fallback.
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

export function logAdminRoleDebug(label, { user, profile, session }) {
  if (!import.meta.env.DEV) return
  console.info(`[Auth] ${label}`, {
    userId: user?.id ?? null,
    email: user?.email ?? profile?.email ?? null,
    profileRole: profile?.role ?? null,
    metadataRole: getMetadataRole(user),
    effectiveRole: resolveEffectiveRole(profile, user),
    hasSession: !!session,
  })
}
