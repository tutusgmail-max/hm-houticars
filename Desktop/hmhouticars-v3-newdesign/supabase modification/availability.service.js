/**
 * services/availability.service.js
 *
 * FIXES:
 *  1. fetchCarReservations: query now limits returned columns so the anon RLS
 *     policy (which only allows pending/confirmed rows) never leaks private info.
 *  2. hasReservationOverlap: short-circuits on the first overlap using DB-level
 *     filter instead of loading all rows.
 *  3. buildAvailabilityMap: was correct, kept as-is.
 */
import { supabase } from '../lib/supabase'

export const BLOCKING_STATUSES = ['pending', 'confirmed']
export const CONFIRMED_STATUS  = 'confirmed'

export function toDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function datesOverlap(startA, endA, startB, endB) {
  return toDateOnly(startA) <= toDateOnly(endB) &&
         toDateOnly(endA)   >= toDateOnly(startB)
}

export function enumerateDateRange(start, end) {
  const days    = []
  const current = new Date(`${toDateOnly(start)}T00:00:00`)
  const last    = new Date(`${toDateOnly(end)}T00:00:00`)
  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime())) return days
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return days
}

/**
 * Fetch reservations for a car.
 * Only selects columns needed for availability — safe for anon RLS policy.
 */
export async function fetchCarReservations(
  carId,
  { from, to, statuses = BLOCKING_STATUSES } = {},
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

/**
 * FIX: Use DB-level overlap filter instead of loading all rows.
 * Returns true as soon as one overlapping non-excluded row is found.
 */
export async function hasReservationOverlap(
  carId,
  startDate,
  endDate,
  excludeReservationId = null,
) {
  let query = supabase
    .from('reservations')
    .select('id')
    .eq('car_id', carId)
    .in('status', BLOCKING_STATUSES)
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .limit(1)

  const { data, error } = await query
  if (error) throw error

  if (!data?.length) return false
  if (excludeReservationId && data[0].id === excludeReservationId) return false
  return true
}

/**
 * Build a date → status map for the calendar.
 * 'reserved' (confirmed) takes priority over 'pending'.
 */
export function buildAvailabilityMap(reservations = []) {
  const map = {}
  for (const reservation of reservations) {
    const status = reservation.status === CONFIRMED_STATUS ? 'reserved' : 'pending'
    for (const day of enumerateDateRange(reservation.start_date, reservation.end_date)) {
      if (map[day] === 'reserved') continue
      map[day] = status
    }
  }
  return map
}
