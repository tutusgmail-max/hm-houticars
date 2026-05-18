const STORAGE_KEY = 'hm_admin_settings'

export const DEFAULT_SETTINGS = {
  logoUrl: '',
  phone: '+212 611 460 900',
  whatsapp: '+212611460900',
  email: 'contact@hmhouticars.ma',
  address: 'Oujda, Maroc',
  facebook: '',
  instagram: '',
  rentalPolicy: 'Caution obligatoire. Permis valide requis. Kilométrage selon contrat.',
  depositAmount: 3000,
  minRentalDays: 1,
}

export function loadAdminSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveAdminSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}
