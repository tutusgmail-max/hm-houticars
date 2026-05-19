/** Reservation identity documents — 4 files, stored once per user, reused on bookings */

export const RESERVATION_DOC_TYPES = [
  { key: 'cin_front', label: 'CIN Recto', icon: '🪪', folder: 'cin', hint: 'Face avant de la carte d\'identité' },
  { key: 'cin_back', label: 'CIN Verso', icon: '🪪', folder: 'cin', hint: 'Face arrière de la carte d\'identité' },
  { key: 'permis_front', label: 'Permis Recto', icon: '🚗', folder: 'permis', hint: 'Face avant du permis de conduire' },
  { key: 'permis_back', label: 'Permis Verso', icon: '🚗', folder: 'permis', hint: 'Face arrière du permis de conduire' },
]

export const RESERVATION_DOC_KEYS = RESERVATION_DOC_TYPES.map((d) => d.key)

/** DB column names on reservations table */
export const DOC_URL_COLUMNS = {
  cin_front: 'cin_front_url',
  cin_back: 'cin_back_url',
  permis_front: 'permis_front_url',
  permis_back: 'permis_back_url',
}

export const ACCEPTED_DOC_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]

export const ACCEPTED_DOC_EXTENSIONS = '.jpg,.jpeg,.png,.pdf'

export const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024

export function emptyDocsState() {
  return Object.fromEntries(RESERVATION_DOC_KEYS.map((k) => [k, null]))
}

/** @deprecated use RESERVATION_DOC_* */
export const IDENTITY_DOC_TYPES = RESERVATION_DOC_TYPES
export const IDENTITY_DOC_KEYS = RESERVATION_DOC_KEYS
