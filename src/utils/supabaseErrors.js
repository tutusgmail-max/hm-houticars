/**
 * User-friendly Supabase / PostgREST error messages (French).
 */
import { parseAuthError } from './authErrors'
import { isAuthRateLimited, getAuthBlockedMessage, isAuthGloballyBlocked } from './authRequestGuard'

export function parseSupabaseError(err) {
  if (!err) return 'Une erreur inattendue est survenue.'

  if (isAuthGloballyBlocked() || isAuthRateLimited(err)) {
    return isAuthGloballyBlocked() ? getAuthBlockedMessage() : parseAuthError(err)
  }

  const code = err?.code || ''
  const msg = (err?.message || err?.error_description || '').toLowerCase()

  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Accès refusé. Reconnectez-vous, puis réessayez.'
  }
  if (code === '23505' || msg.includes('duplicate key')) {
    return 'Cette donnée existe déjà (référence ou email en double).'
  }
  if (code === 'PGRST204' || msg.includes('schema cache') || msg.includes('column')) {
    return 'Mise à jour base de données en cours. Réessayez dans quelques secondes.'
  }
  if (code === 'PGRST200' || msg.includes('relationship')) {
    return 'Connexion base de données temporaire. Actualisez la page.'
  }
  if (msg.includes('jwt') || msg.includes('not authenticated') || msg.includes('session')) {
    return 'Session expirée. Reconnectez-vous pour continuer.'
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Connexion impossible. Vérifiez votre réseau et la configuration Supabase.'
  }

  return parseAuthError(err)
}
