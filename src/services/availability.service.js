/**
 * availability.service.js — v4 PRODUCTION
 *
 * FIX CRITIQUE : BLOCKING_STATUSES = ['confirmed', 'completed'] UNIQUEMENT
 * 'pending' ne bloque PAS les nouvelles demandes.
 * Plusieurs clients peuvent demander les mêmes dates ; l'admin confirme le premier.
 * Le calendrier affiche pending (amber) vs confirmed (rouge) vs disponible (vert).
 */
import { supabase } from '../lib/supabase'

export const BLOCKING_STATUSES  = ['confirmed', 'completed']
export const ALL_ACTIVE_STATUSES = ['pending', 'confirmed', 'completed']
export const CONFIRMED_STATUS    = 'confirmed'

export function toDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function datesOverlap(startA, endA, startB, endB) {
  return toDateOnly(startA) <= toDateOnly(endB) &&
         toDateOnly(endA)   >= toDateOnly(startB)
}

const MAX_ENUM_DAYS = 366

export function enumerateDateRange(start, end) {
  const days    = []
  const current = new Date(`${toDateOnly(start)}T00:00:00`)
  const last    = new Date(`${toDateOnly(end)}T00:00:00`)
  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime())) return days
  let guard = 0
  while (current <= last && guard < MAX_ENUM_DAYS) {
    days.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
    guard += 1
  }
  return days
}

export async function fetchCarReservations(
  carId,
  { from, to, statuses = ALL_ACTIVE_STATUSES } = {},
) {
  let query = supabase
    .from('reservations')
    .select('id, car_id, car_name, start_date, end_date, status, customer_name, ref')
    .eq('car_id', carId)
    .in('status', statuses)
    .order('start_date', { ascending: true })

  if (from) query = query.gte('end_date', from)
  if (to)   query = query.lte('start_date', to)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function hasReservationOverlap(
  carId,
  startDate,
  endDate,
  excludeReservationId = null,
) {
  const rows = await fetchCarReservations(carId, {
    from:     startDate,
    to:       endDate,
    statuses: BLOCKING_STATUSES,
  })
  return rows.some((row) => {
    if (excludeReservationId && row.id === excludeReservationId) return false
    return datesOverlap(startDate, endDate, row.start_date, row.end_date)
  })
}

export function buildAvailabilityMap(reservations = []) {
  const map = {}
  for (const reservation of reservations) {
    const isConfirmed =
      reservation.status === 'confirmed' || reservation.status === 'completed'
    const status = isConfirmed ? 'reserved' : 'pending'
    for (const day of enumerateDateRange(reservation.start_date, reservation.end_date)) {
      if (map[day] === 'reserved') continue
      map[day] = status
    }
  }
  return map
}
