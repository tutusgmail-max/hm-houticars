import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('SUPABASE URL:', supabaseUrl)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy `.env.example` to `.env` and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function signUp({ email, password, fullName, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
    },
  })
  if (error) throw error

  // Insert profile row
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      phone,
      email,
      role: 'client',
    }, { onConflict: 'id' })
    if (profileError) {
      console.warn('[signUp] profile upsert:', profileError.message)
    }
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
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}

// ─── Reservations ────────────────────────────────────────────────────────────

/** Expand reservation date ranges into individual YYYY-MM-DD strings (inclusive). */
export function expandReservationDates(ranges) {
  const dates = new Set()
  for (const row of ranges || []) {
    if (!row?.start_date || !row?.end_date) continue
    const start = new Date(`${row.start_date}T00:00:00`)
    const end = new Date(`${row.end_date}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.add(d.toISOString().split('T')[0])
    }
  }
  return [...dates]
}

/** Booked days for a car (pending + confirmed) — used by availability calendar. */
export async function getCarBookedDates(carId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('start_date, end_date')
    .eq('car_id', carId)
    .in('status', ['pending', 'confirmed'])
  if (error) throw error
  return expandReservationDates(data)
}

/** Storage paths or URLs for jsonb documents column */
export function sanitizeReservationDocuments(documents) {
  if (!documents || typeof documents !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(documents)) {
    if (typeof value === 'string' && value.length > 0) out[key] = value
  }
  return out
}

/** Map UI reservation payload → PostgREST row (supports v3 + legacy column names). */
export function mapReservationToRow(reservation) {
  const docUrls = sanitizeReservationDocuments(reservation.documents)
  const notesParts = []
  if (reservation.notes) notesParts.push(reservation.notes)
  if (reservation.pickup_location) notesParts.push(`Prise en charge: ${reservation.pickup_location}`)
  if (reservation.return_location) notesParts.push(`Retour: ${reservation.return_location}`)
  if (Object.keys(docUrls).length > 0) {
    notesParts.push(`Documents: ${JSON.stringify(docUrls)}`)
  }

  const row = {
    user_id: reservation.user_id,
    car_id: reservation.car_id,
    car_name: reservation.car_name,
    car_price: reservation.car_price,
    start_date: reservation.start_date,
    end_date: reservation.end_date,
    days: reservation.days,
    payment_method: reservation.payment_method,
    customer_name: reservation.customer_name,
    customer_email: reservation.customer_email,
    customer_phone: reservation.customer_phone,
    status: reservation.status ?? 'pending',
    notes: notesParts.length ? notesParts.join('\n') : null,
    cin_front_url: reservation.cin_front_url ?? null,
    cin_back_url: reservation.cin_back_url ?? null,
    permis_front_url: reservation.permis_front_url ?? null,
    permis_back_url: reservation.permis_back_url ?? null,
    reference: reservation.ref,
    total_price: reservation.total,
    ref: reservation.ref,
    total: reservation.total,
    pickup_location: reservation.pickup_location,
    return_location: reservation.return_location,
    documents: docUrls,
  }

  return row
}

/** Map DB row → UI shape used by dashboards and receipt modal. */
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
    ref: row.ref ?? row.reference ?? '—',
    total: row.total ?? row.total_price ?? 0,
    pickup_location: pickup_location ?? '—',
    return_location: return_location ?? '—',
  }
}

export async function createReservation(reservation) {
  const baseRow = mapReservationToRow(reservation)
  let { data, error } = await supabase.from('reservations').insert(baseRow).select().single()

  // Retry without v3-only columns if schema cache lacks them
  if (error?.code === 'PGRST204') {
    const {
      ref: _r,
      total: _t,
      pickup_location: _p,
      return_location: _rl,
      documents: _d,
      cin_front_url: _cf,
      cin_back_url: _cb,
      permis_front_url: _pf,
      permis_back_url: _pb,
      ...legacyRow
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
  if (error) throw error
  return (data || []).map(mapRowToReservation)
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

// ─── Document upload ─────────────────────────────────────────────────────────

export async function uploadDocument(userId, docType, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
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

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
