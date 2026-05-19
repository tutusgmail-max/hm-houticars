/**
 * availability.service.js — v3.2 FIXED
 *
 * CRITICAL FIX: BLOCKING_STATUSES no longer includes 'pending'.
 * Only 'confirmed' and 'completed' reservations block new bookings.
 * Multiple customers can request the same dates; admin confirms the first one.
 * Calendar display still shows pending (amber) vs confirmed (red).
 */
import { supabase } from '../lib/supabase'

/** Statuses that physically block a date range from new bookings */
export const BLOCKING_STATUSES = ['confirmed', 'completed']

/** Legacy alias — confirmed status string */
export const CONFIRMED_STATUS = 'confirmed'

/** All active statuses for calendar display (pending + confirmed + completed) */
export const ALL_ACTIVE_STATUSES = ['pending', 'confirmed', 'completed']

export function toDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function datesOverlap(startA, endA, startB, endB) {
  const aStart = toDateOnly(startA)
  const aEnd   = toDateOnly(endA)
  const bStart = toDateOnly(startB)
  const bEnd   = toDateOnly(endB)
  return aStart <= bEnd && aEnd >= bStart
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
 * Default statuses: ALL_ACTIVE_STATUSES (pending + confirmed + completed) for calendar display.
 * For blocking new-booking checks, pass statuses = BLOCKING_STATUSES.
 */
export async function fetchCarReservations(carId, { from, to, statuses = ALL_ACTIVE_STATUSES } = {}) {
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
 * Check date overlap ONLY against confirmed/completed reservations.
 * Pending reservations do NOT block — admin confirms the first winner.
 */
export async function hasReservationOverlap(carId, startDate, endDate, excludeReservationId = null) {
  const rows = await fetchCarReservations(carId, {
    from: startDate,
    to: endDate,
    statuses: BLOCKING_STATUSES,
  })
  return rows.some((row) => {
    if (excludeReservationId && row.id === excludeReservationId) return false
    return datesOverlap(startDate, endDate, row.start_date, row.end_date)
  })
}

/**
 * Build availability map for calendar display.
 * 'reserved' = confirmed/completed → red cells
 * 'pending'  = pending             → amber/yellow cells
 * (unset)    = available           → green cells
 */
export function buildAvailabilityMap(reservations = []) {
  const map = {}
  for (const reservation of reservations) {
    const isConfirmed = reservation.status === 'confirmed' || reservation.status === 'completed'
    const status = isConfirmed ? 'reserved' : 'pending'
    for (const day of enumerateDateRange(reservation.start_date, reservation.end_date)) {
      if (map[day] === 'reserved') continue // confirmed always wins
      map[day] = status
    }
  }
  return map
}
