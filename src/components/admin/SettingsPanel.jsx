import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Save } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { loadAdminSettings, saveAdminSettings } from '../../services/adminSettings.service'
import GlassCard from './ui/GlassCard'

const FIELDS = [
  { key: 'logoUrl', label: 'URL du logo', type: 'url' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'whatsapp', label: 'WhatsApp (sans espaces)' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Adresse' },
  { key: 'facebook', label: 'Facebook URL' },
  { key: 'instagram', label: 'Instagram URL' },
  { key: 'depositAmount', label: 'Caution (DH)', type: 'number' },
  { key: 'minRentalDays', label: 'Jours minimum', type: 'number' },
]

export default function SettingsPanel() {
  const { addToast } = useApp()
  const [form, setForm] = useState(() => loadAdminSettings())
  const [saving, setSaving] = useState(false)

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      saveAdminSettings(form)
      addToast('Paramètres enregistrés')
    } catch {
      addToast('Erreur', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#C9A84C]">Contact & marque</h3>
          {FIELDS.slice(0, 7).map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/45 mb-1.5">
                {label}
              </label>
              <input
                type={type || 'text'}
                value={form[key] ?? ''}
                onChange={(e) => upd(key, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#C9A84C]/40"
              />
            </div>
          ))}
        </GlassCard>

        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#C9A84C]">Politique & tarifs</h3>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/45 mb-1.5">
              Politique de location
            </label>
            <textarea
              value={form.rentalPolicy ?? ''}
              onChange={(e) => upd('rentalPolicy', e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none resize-none"
            />
          </div>
          {FIELDS.slice(7).map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/45 mb-1.5">
                {label}
              </label>
              <input
                type={type || 'text'}
                value={form[key] ?? ''}
                onChange={(e) => upd(key, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
              />
            </div>
          ))}
        </GlassCard>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8C76A] text-[#0B1623] font-bold disabled:opacity-60"
        >
          <Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </motion.div>
  )
}
