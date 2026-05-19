import { supabase } from '../lib/supabase'

export const BLOCKING_STATUSES = ['pending', 'confirmed']
export const CONFIRMED_STATUS = 'confirmed'

export function toDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function datesOverlap(startA, endA, startB, endB) {
  const aStart = toDateOnly(startA)
  const aEnd = toDateOnly(endA)
  const bStart = toDateOnly(startB)
  const bEnd = toDateOnly(endB)
  return aStart <= bEnd && aEnd >= bStart
}

export function enumerateDateRange(start, end) {
  const days = []
  const current = new Date(`${toDateOnly(start)}T00:00:00`)
  const last = new Date(`${toDateOnly(end)}T00:00:00`)
  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime())) return days
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return days
}

export async function fetchCarReservations(carId, { from, to, statuses = BLOCKING_STATUSES } = {}) {
  let query = supabase
    .from('reservations')
    .select('id, car_id, car_name, start_date, end_date, status, customer_name, ref')
    .eq('car_id', carId)
    .in('status', statuses)
    .order('start_date', { ascending: true })

  if (from) query = query.gte('end_date', from)
  if (to) query = query.lte('start_date', to)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function hasReservationOverlap(carId, startDate, endDate, excludeReservationId = null) {
  const rows = await fetchCarReservations(carId, { from: startDate, to: endDate })
  return rows.some((row) => {
    if (excludeReservationId && row.id === excludeReservationId) return false
    return datesOverlap(startDate, endDate, row.start_date, row.end_date)
  })
}

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
