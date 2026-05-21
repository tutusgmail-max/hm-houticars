/**
 * supabase.js — v4 PRODUCTION
 *
 * FIXES vs v3 :
 * 1. Client Supabase avec options de persistance session
 * 2. createReservation : overlap check + retry sans colonnes v3 si PGRST204
 * 3. uploadDocument : path correct (folder/userId/docType.ext)
 * 4. getAllReservations : join profiles pour customer info
 * 5. mapReservationToRow / mapRowToReservation : robustes null-safe
 */
import { createClient } from '@supabase/supabase-js'

// Vite only exposes env vars prefixed with VITE_
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function getSupabaseProjectRefFromUrl(url) {
  try {
    const u = new URL(url)
    // <ref>.supabase.co
    const host = u.hostname || ''
    return host.endsWith('.supabase.co') ? host.replace(/\.supabase\.co$/i, '') : null
  } catch {
    return null
  }
}

const CONFIG_ERROR = 'Une erreur est survenue. Réessayez plus tard.'

function assertSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.DEV) {
      console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
    }
    throw new Error(CONFIG_ERROR)
  }

  let parsedUrl
  try {
    parsedUrl = new URL(supabaseUrl)
  } catch {
    if (import.meta.env.DEV) console.error('[Supabase] Invalid VITE_SUPABASE_URL:', supabaseUrl)
    throw new Error(CONFIG_ERROR)
  }

  if (parsedUrl.protocol !== 'https:') {
    if (import.meta.env.DEV) console.error('[Supabase] URL must use https://', supabaseUrl)
    throw new Error(CONFIG_ERROR)
  }

  const urlRef = getSupabaseProjectRefFromUrl(supabaseUrl)
  const jwtPayload = decodeJwtPayload(supabaseAnonKey)
  const keyRef = jwtPayload?.ref || null

  if (!urlRef) {
    if (import.meta.env.DEV) console.error('[Supabase] URL must be https://<ref>.supabase.co')
    throw new Error(CONFIG_ERROR)
  }
  if (keyRef && keyRef !== urlRef) {
    if (import.meta.env.DEV) {
      console.error('[Supabase] URL ref and anon key ref mismatch', { urlRef, keyRef })
    }
    throw new Error(CONFIG_ERROR)
  }
  if (jwtPayload?.role === 'service_role') {
    if (import.meta.env.DEV) console.error('[Supabase] service_role must not be used in VITE_SUPABASE_ANON_KEY')
    throw new Error(CONFIG_ERROR)
  }

}

assertSupabaseConfig()

/** Safe config snapshot for auth debug logs (no secrets) */
export function getSupabasePublicConfig() {
  const urlRef = getSupabaseProjectRefFromUrl(supabaseUrl)
  const keyRef = decodeJwtPayload(supabaseAnonKey)?.ref ?? null
  return {
    url: supabaseUrl,
    projectRef: urlRef,
    anonKeyRef: keyRef,
    refsMatch: !keyRef || keyRef === urlRef,
    https: supabaseUrl.startsWith('https://'),
  }
}

if (import.meta.env.DEV) {
  console.error('[Supabase] client ready', getSupabasePublicConfig())
}

/** Only parse OAuth/recovery tokens on routes that need them (avoids stray hash processing) */
function shouldDetectSessionInUrl() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname || ''
  return path === '/reset-password' || window.location.hash.includes('access_token')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: shouldDetectSessionInUrl(),
    storageKey:         'hmhouticars-auth',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Auth: use src/services/auth.service.js (single gateway — avoids duplicate API calls)

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}

// ─── Reservations helpers ─────────────────────────────────────────────────────

export function expandReservationDates(ranges) {
  const dates = new Set()
  for (const row of ranges || []) {
    if (!row?.start_date || !row?.end_date) continue
    const start = new Date(`${row.start_date}T00:00:00`)
    const end   = new Date(`${row.end_date}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.add(d.toISOString().split('T')[0])
    }
  }
  return [...dates]
}

/** Booked days for a car — only confirmed/completed block new bookings */
export async function getCarBookedDates(carId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('start_date, end_date')
    .eq('car_id', carId)
    .in('status', ['confirmed', 'completed'])
  if (error) throw error
  return expandReservationDates(data)
}

export function sanitizeReservationDocuments(documents) {
  if (!documents || typeof documents !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(documents)) {
    if (typeof value === 'string' && value.length > 0) out[key] = value
    else if (value && typeof value === 'object' && value.url) out[key] = value.url
  }
  return out
}

function getJoinedProfile(row) {
  const p = row?.profiles
  if (!p) return null
  return Array.isArray(p) ? p[0] : p
}

/** Strip system-injected location lines from notes for admin display. */
export function cleanReservationNotes(notes) {
  if (!notes || typeof notes !== 'string') return null
  const cleaned = notes
    .split('\n')
    .filter((line) => !/^(Prise en charge|Retour)\s*:/i.test(line.trim()))
    .join('\n')
    .trim()
  return cleaned || null
}

export function mapReservationToRow(reservation) {
  const docUrls = sanitizeReservationDocuments(reservation.documents)
  const totalRounded = Math.round(Number(reservation.total) || 0)

  return {
    user_id:          reservation.user_id,
    car_id:           reservation.car_id,
    car_name:         reservation.car_name,
    car_price:        reservation.car_price   ?? 0,
    start_date:       reservation.start_date,
    end_date:         reservation.end_date,
    days:             reservation.days         ?? 1,
    payment_method:   reservation.payment_method ?? 'cash',
    customer_name:    reservation.customer_name  ?? null,
    customer_email:   reservation.customer_email ?? null,
    customer_phone:   reservation.customer_phone ?? null,
    status:           reservation.status         ?? 'pending',
    notes:            reservation.notes || null,
    cin_front_url:    reservation.cin_front_url    ?? null,
    cin_back_url:     reservation.cin_back_url     ?? null,
    permis_front_url: reservation.permis_front_url ?? null,
    permis_back_url:  reservation.permis_back_url  ?? null,
    ref:              reservation.ref      ?? null,
    reference:        reservation.ref      ?? null,
    total:            totalRounded || null,
    total_price:      totalRounded || null,
    pickup_location:  reservation.pickup_location ?? null,
    return_location:  reservation.return_location ?? null,
    documents:        Object.keys(docUrls).length ? docUrls : {},
  }
}

export function mapRowToReservation(row) {
  if (!row) return row
  const profile = getJoinedProfile(row)
  let pickup_location = row.pickup_location
  let return_location = row.return_location
  // Fallback: extraire depuis notes si colonnes manquantes (legacy rows)
  if (row.notes) {
    if (!pickup_location) {
      const m = row.notes.match(/Prise en charge:\s*(.+?)(?:\n|$)/i)
      if (m) pickup_location = m[1].trim()
    }
    if (!return_location) {
      const m = row.notes.match(/Retour:\s*(.+?)(?:\n|$)/i)
      if (m) return_location = m[1].trim()
    }
  }
  const total = Number(row.total ?? row.total_price ?? 0) || 0
  return {
    ...row,
    ref:              row.ref ?? row.reference ?? '—',
    total,
    customer_name:    row.customer_name || profile?.full_name || null,
    customer_email:   row.customer_email || profile?.email || null,
    customer_phone:   row.customer_phone || profile?.phone || null,
    pickup_location:  pickup_location || '—',
    return_location:  return_location || '—',
    notes:            cleanReservationNotes(row.notes),
    profiles:         profile || row.profiles,
  }
}

export async function createReservation(reservation) {
  // FIX : seuls confirmed/completed bloquent — pending = juste une demande
  const { data: overlaps, error: overlapError } = await supabase
    .from('reservations')
    .select('id')
    .eq('car_id', reservation.car_id)
    .in('status', ['confirmed', 'completed'])
    .lte('start_date', reservation.end_date)
    .gte('end_date', reservation.start_date)
    .limit(1)

  if (overlapError) throw overlapError
  if (overlaps?.length) {
    throw new Error('Ce véhicule est déjà confirmé sur ces dates. Choisissez d\'autres dates.')
  }

  const baseRow = mapReservationToRow(reservation)

  /**
   * PRODUCTION FIX:
   * After deployments/migrations, Supabase PostgREST can temporarily run with a stale
   * schema cache and throw errors like PGRST204 / "schema cache". That makes the
   * reservation flow feel "randomly broken".
   *
   * Strategy:
   * - attempt insert
   * - if schema-cache related, retry once after a short delay
   * - keep the existing legacy retry for PGRST204 (older column set)
   */
  const insertOnce = async (row) => supabase.from('reservations').insert(row).select().single()

  let { data, error } = await insertOnce(baseRow)

  if (error && (error.code === 'PGRST204' || /schema cache/i.test(error.message || ''))) {
    // Short backoff then retry once
    await new Promise((r) => setTimeout(r, 600))
    ;({ data, error } = await insertOnce(baseRow))
  }

  // FIX : retry sans colonnes v3+ si schema cache manquant (PGRST204)
  if (error?.code === 'PGRST204') {
    const {
      ref: _r, total: _t, pickup_location: _p, return_location: _rl,
      documents: _d, cin_front_url: _cf, cin_back_url: _cb,
      permis_front_url: _pf, permis_back_url: _pb,
      reference: _ref, total_price: _tp,
      ...legacyRow
    } = baseRow
    ;({ data, error } = await insertOnce(legacyRow))
  }

  if (error) throw error
  return mapRowToReservation(data)
}

export async function getUserReservations(userId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapRowToReservation)
}

function enrichReservationsWithProfiles(rows, profiles) {
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  return rows.map((row) => {
    const profile = row.user_id ? byId[row.user_id] : null
    const pick = profile
      ? { full_name: profile.full_name, email: profile.email, phone: profile.phone }
      : row.profiles || null
    return mapRowToReservation({
      ...row,
      profiles: pick,
      customer_name: row.customer_name || profile?.full_name || null,
      customer_email: row.customer_email || profile?.email || null,
      customer_phone: row.customer_phone || profile?.phone || null,
    })
  })
}

export async function getAllReservations() {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, profiles(full_name, email, phone)')
    .order('created_at', { ascending: false })

  if (!error) return (data || []).map(mapRowToReservation)

  const schemaIssue =
    error?.code === 'PGRST200' ||
    /relationship|schema cache|incompatible/i.test(error?.message || '')

  if (schemaIssue) {
    console.warn(
      '[getAllReservations] PostgREST embed unavailable — using plain select + profile merge:',
      error.message,
    )
  } else {
    console.warn('[getAllReservations] join failed:', error.message)
  }

  const { data: plain, error: plainErr } = await supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false })
  if (plainErr) throw plainErr

  const mapped = (plain || []).map(mapRowToReservation)
  try {
    const profiles = await getAllProfiles()
    return enrichReservationsWithProfiles(mapped, profiles)
  } catch {
    return mapped
  }
}

export async function updateReservationStatus(id, status) {
  const { error } = await supabase
    .from('reservations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteReservation(id) {
  const { error } = await supabase.from('reservations').delete().eq('id', id)
  if (error) throw error
}

// ─── Document upload ──────────────────────────────────────────────────────────

export async function uploadDocument(userId, docType, file) {
  // FIX : path = cin/{userId}/cin_front.jpg (aligné avec documentUpload.service.js)
  const folder   = docType.startsWith('cin') ? 'cin' : 'permis'
  const ext      = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path     = `${folder}/${userId}/${docType}.${ext}`

  const { error } = await supabase.storage.from('documents').upload(path, file, {
    cacheControl: '3600',
    upsert:       true,
    contentType:  file.type || 'image/jpeg',
  })
  if (error) throw error

  // Documents bucket est privé → signed URL
  const { data: signedData, error: signErr } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  if (signErr) {
    // Fallback : public URL si bucket rendu public
    const { data } = supabase.storage.from('documents').getPublicUrl(path)
    return data.publicUrl
  }
  return signedData.signedUrl
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function isSchemaOrRlsError(error) {
  if (!error) return false
  const code = error.code || ''
  const msg = error.message || ''
  return (
    code === 'PGRST200' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    code === '42P01' ||
    /relationship|schema cache|incompatible|permission denied|row-level security/i.test(msg)
  )
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    if (isSchemaOrRlsError(error)) {
      console.warn('[getAllProfiles]', error.message)
      return []
    }
    throw error
  }
  return data || []
}
