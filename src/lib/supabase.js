import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy `.env.example` to `.env` and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Hash tokens consumed manually in AuthHashRouter (route-aware, no /admin hijack).
    detectSessionInUrl: false,
    storageKey: 'hmhouticars-auth',
  },
})

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function signUp({ email, password, fullName, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  })
  if (error) throw error

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      phone,
      email,
      role: 'client',
    }, { onConflict: 'id' })
    if (profileError) console.warn('[signUp] profile upsert:', profileError.message)
  }
  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

// ─── Reservations ────────────────────────────────────────────────────────────

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

export function mapReservationToRow(reservation) {
  const docUrls = sanitizeReservationDocuments(reservation.documents)
  const notesParts = []
  if (reservation.notes) notesParts.push(reservation.notes)
  if (reservation.pickup_location) notesParts.push(`Prise en charge: ${reservation.pickup_location}`)
  if (reservation.return_location) notesParts.push(`Retour: ${reservation.return_location}`)
  if (Object.keys(docUrls).length > 0) {
    notesParts.push(`Documents: ${JSON.stringify(docUrls)}`)
  }

  return {
    user_id:          reservation.user_id,
    car_id:           reservation.car_id,
    car_name:         reservation.car_name,
    car_price:        reservation.car_price,
    start_date:       reservation.start_date,
    end_date:         reservation.end_date,
    days:             reservation.days,
    payment_method:   reservation.payment_method,
    customer_name:    reservation.customer_name,
    customer_email:   reservation.customer_email,
    customer_phone:   reservation.customer_phone,
    status:           reservation.status ?? 'pending',
    notes:            notesParts.length ? notesParts.join('\n') : null,
    cin_front_url:    reservation.cin_front_url  ?? null,
    cin_back_url:     reservation.cin_back_url   ?? null,
    permis_front_url: reservation.permis_front_url ?? null,
    permis_back_url:  reservation.permis_back_url  ?? null,
    reference:        reservation.ref,
    total_price:      reservation.total,
    ref:              reservation.ref,
    total:            reservation.total,
    pickup_location:  reservation.pickup_location,
    return_location:  reservation.return_location,
    documents:        docUrls,
  }
}

export function mapRowToReservation(row) {
  if (!row) return row
  let pickup_location = row.pickup_location
  let return_location = row.return_location
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
  return {
    ...row,
    ref:             row.ref ?? row.reference ?? '—',
    total:           row.total ?? row.total_price ?? 0,
    pickup_location: pickup_location ?? '—',
    return_location: return_location ?? '—',
    source:          row.source ?? 'website',
    is_guest:        row.is_guest ?? false,
    admin_notes:     row.admin_notes ?? null,
  }
}

export async function createReservation(reservation) {
  // FIX: Only check against confirmed/completed — pending doesn't block new requests
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
  let { data, error } = await supabase.from('reservations').insert(baseRow).select().single()

  // Retry without v3-only columns if schema cache lacks them
  if (error?.code === 'PGRST204') {
    const {
      ref: _r, total: _t, pickup_location: _p, return_location: _rl,
      documents: _d, cin_front_url: _cf, cin_back_url: _cb,
      permis_front_url: _pf, permis_back_url: _pb, ...legacyRow
    } = baseRow
    ;({ data, error } = await supabase.from('reservations').insert(legacyRow).select().single())
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

export async function getAllReservations() {
  const { data, error } = await supabase
    .from('reservations')
    .select(`*, profiles(full_name, email, phone)`)
    .order('created_at', { ascending: false })

  if (!error) return (data || []).map(mapRowToReservation)

  if (error.code === 'PGRST200' || /relationship|schema cache/i.test(error.message || '')) {
    const { data: plain, error: plainErr } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false })
    if (plainErr) throw plainErr
    return (plain || []).map(mapRowToReservation)
  }

  throw error
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

export async function updateReservationFull(id, updates) {
  const { data, error } = await supabase
    .from('reservations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapRowToReservation(data)
}

export async function createAdminReservation(reservation, adminId) {
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
    throw new Error('Ce véhicule est déjà confirmé sur ces dates.')
  }

  const ref = reservation.ref || `ADM-${Date.now().toString(36).toUpperCase()}`
  const baseRow = {
    ...mapReservationToRow({ ...reservation, ref }),
    source: 'admin',
    is_guest: !reservation.user_id,
    created_by_admin_id: adminId || null,
    status: reservation.status || 'confirmed',
    admin_notes: reservation.admin_notes || null,
  }

  const insertOnce = async (row) =>
    supabase.from('reservations').insert(row).select().single()

  let { data, error } = await insertOnce(baseRow)

  if (error && (error.code === 'PGRST204' || /schema cache/i.test(error.message || ''))) {
    await new Promise((r) => setTimeout(r, 600))
    ;({ data, error } = await insertOnce(baseRow))
  }

  if (error?.code === 'PGRST204') {
    const {
      ref: _r, total: _t, pickup_location: _p, return_location: _rl,
      documents: _d, cin_front_url: _cf, cin_back_url: _cb,
      permis_front_url: _pf, permis_back_url: _pb,
      reference: _ref, total_price: _tp,
      source: _src, is_guest: _ig, created_by_admin_id: _ca,
      admin_notes: _an,
      ...legacyRow
    } = baseRow
    ;({ data, error } = await insertOnce(legacyRow))
  }

  if (error) throw error

  try {
    await writeAuditLog({
      admin_id: adminId,
      action: 'create_reservation',
      entity_type: 'reservation',
      entity_id: data.id,
      new_data: data,
      meta: { source: 'admin_panel', ref },
    })
  } catch (_) {}

  return mapRowToReservation(data)
}

export async function writeAuditLog({ admin_id, action, entity_type, entity_id, old_data, new_data, meta }) {
  const { error } = await supabase.from('audit_logs').insert({
    admin_id: admin_id || null,
    action,
    entity_type,
    entity_id: entity_id ? String(entity_id) : null,
    old_data: old_data || null,
    new_data: new_data || null,
    meta: meta || null,
  })
  if (error) console.warn('[auditLog] write failed:', error.message)
}

export async function getAuditLogs({ limit = 100, entity_type, entity_id, admin_id } = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entity_type) query = query.eq('entity_type', entity_type)
  if (entity_id) query = query.eq('entity_id', String(entity_id))
  if (admin_id) query = query.eq('admin_id', admin_id)

  const { data, error } = await query
  if (error) {
    if (isSchemaOrRlsError(error)) return []
    throw error
  }
  return data || []
}

// ─── Document upload ─────────────────────────────────────────────────────────

export async function uploadDocument(userId, docType, file) {
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/${docType}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error
  const { data } = supabase.storage.from('documents').getPublicUrl(path)
  return data.publicUrl
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export function isSchemaOrRlsError(error) {
  if (!error) return false
  const code = error.code || ''
  const msg = error.message || ''
  return (
    code === 'PGRST200'
    || code === 'PGRST204'
    || code === 'PGRST205'
    || code === '42P01'
    || /permission denied|row-level security|schema cache/i.test(msg)
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
