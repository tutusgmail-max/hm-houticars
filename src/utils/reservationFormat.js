/** Display helpers for reservations (admin + dashboard). */

export function formatReservationDate(value) {
  if (!value) return '—'
  const iso = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(value)
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatMoneyDh(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString('fr-FR')} DH`
}

export function reservationDateRange(r) {
  const start = formatReservationDate(r?.start_date)
  const end = formatReservationDate(r?.end_date)
  if (start === '—' && end === '—') return '—'
  return `${start} → ${end}`
}

export function reservationCustomerName(r) {
  if (!r) return '—'
  return r.customer_name || r.profiles?.full_name || '—'
}

export function reservationCustomerPhone(r) {
  if (!r) return '—'
  return r.customer_phone || r.profiles?.phone || '—'
}
