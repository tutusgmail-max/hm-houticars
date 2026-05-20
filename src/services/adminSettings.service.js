/**
 * adminSettings.service.js
 *
 * BUG: Settings were stored ONLY in localStorage.
 * This means settings are device-local and lost on:
 *   - Clearing browser data
 *   - Switching devices / browsers
 *   - Deploying on a new machine
 *
 * FIX: Implement a Supabase-backed approach using the profiles table
 * (admin_settings jsonb column) with localStorage as a fast-loading cache.
 * Falls back gracefully if the column doesn't exist yet.
 *
 * The SQL migration (20260528_admin_settings.sql) adds the column.
 * Until that migration runs, the service degrades to localStorage-only.
 */
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'hm_admin_settings'

export const DEFAULT_SETTINGS = {
  logoUrl:       '',
  phone:         '+212 611 460 900',
  whatsapp:      '+212611460900',
  email:         'contact@hmhouticars.ma',
  address:       'Oujda, Maroc',
  facebook:      '',
  instagram:     '',
  rentalPolicy:  'Caution obligatoire. Permis valide requis. Kilométrage selon contrat.',
  depositAmount: 3000,
  minRentalDays: 1,
}

/** Load from localStorage cache (synchronous, used for initial render) */
export function loadAdminSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** Persist to localStorage */
function persistLocally(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)) } catch {}
  return merged
}

/**
 * Load settings from Supabase (admin profile row), falling back to localStorage.
 * Components should call this on mount for accurate cross-device data.
 */
export async function loadAdminSettingsRemote() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return loadAdminSettings()

    const { data, error } = await supabase
      .from('profiles')
      .select('admin_settings')
      .eq('id', user.id)
      .single()

    // admin_settings column may not exist yet (migration pending)
    if (error || !data?.admin_settings) return loadAdminSettings()

    const merged = { ...DEFAULT_SETTINGS, ...data.admin_settings }
    persistLocally(merged) // keep local cache in sync
    return merged
  } catch {
    return loadAdminSettings()
  }
}

/**
 * Save settings both to Supabase and localStorage cache.
 */
export async function saveAdminSettings(settings) {
  const merged = persistLocally(settings)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Silently ignore if admin_settings column doesn't exist yet
      await supabase
        .from('profiles')
        .update({ admin_settings: merged })
        .eq('id', user.id)
    }
  } catch {
    // Non-fatal — local cache was already saved
  }
  return merged
}
