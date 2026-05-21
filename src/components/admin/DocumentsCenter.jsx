import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ZoomIn, Download, CheckCircle, XCircle } from 'lucide-react'
import { useAdminData } from '../../context/AdminDataContext'
import { resolveDocumentLinks } from '../../services/documentUpload.service'
import { useApp } from '../../context/AppContext'
import GlassCard from './ui/GlassCard'
import StatusBadge from './ui/StatusBadge'
import AdminModal from './ui/AdminModal'

const DOC_KEYS = [
  { key: 'cin_front', label: 'CIN Recto' },
  { key: 'cin_back', label: 'CIN Verso' },
  { key: 'permis_front', label: 'Permis Recto' },
  { key: 'permis_back', label: 'Permis Verso' },
]

function hasAllDocs(res) {
  const d = res.documents || {}
  return (
    res.cin_front_url ||
    res.cin_back_url ||
    res.permis_front_url ||
    res.permis_back_url ||
    d.cin_front ||
    d.cin_back ||
    d.permis_front ||
    d.permis_back
  )
}

export default function DocumentsCenter() {
  const { reservations } = useAdminData()
  const { addToast } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [zoom, setZoom] = useState(null)
  const [loadingId, setLoadingId] = useState(null)

  const withDocs = useMemo(
    () => reservations.filter((r) => hasAllDocs(r) || Object.values(r.documents || {}).some(Boolean)),
    [reservations],
  )

  const filtered = useMemo(() => {
    return withDocs.filter((r) => {
      const q = search.toLowerCase()
      const matchQ =
        !q ||
        (r.customer_name || '').toLowerCase().includes(q) ||
        r.ref?.toLowerCase().includes(q)
      const complete = DOC_KEYS.every(
        (d) => r[`${d.key}_url`] || r.documents?.[d.key],
      )
      if (filter === 'verified') return matchQ && complete
      if (filter === 'pending') return matchQ && !complete
      return matchQ
    })
  }, [withDocs, search, filter])

  const openZoom = async (res, docKey, label) => {
    setLoadingId(res.id)
    try {
      const links = await resolveDocumentLinks({
        ...(res.documents || {}),
        cin_front: res.cin_front_url,
        cin_back: res.cin_back_url,
        permis_front: res.permis_front_url,
        permis_back: res.permis_back_url,
      })
      if (links[docKey]) setZoom({ url: links[docKey], label, name: res.customer_name })
      else addToast('Document non disponible', 'error')
    } catch {
      addToast('Erreur chargement', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <GlassCard className="p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher client ou réf..."
            className="w-full pl-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
        >
          <option value="all">Tous</option>
          <option value="verified">Complets</option>
          <option value="pending">Incomplets</option>
        </select>
      </GlassCard>

      <div className="grid gap-4">
        {filtered.map((r) => {
          const complete = DOC_KEYS.every((d) => r[`${d.key}_url`] || r.documents?.[d.key])
          return (
            <GlassCard key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-white">{r.customer_name || 'Client'}</h3>
                  <p className="text-xs text-white/45">
                    {r.ref} · {r.car_name} · {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {complete ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                      <CheckCircle size={14} /> Vérifié
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                      <XCircle size={14} /> Incomplet
                    </span>
                  )}
                  <StatusBadge status={r.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DOC_KEYS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={loadingId === r.id}
                    onClick={() => openZoom(r, key, label)}
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:border-[#C9A84C]/40 hover:bg-[#C9A84C]/5 text-left transition-all disabled:opacity-50"
                  >
                    <ZoomIn size={18} className="text-[#C9A84C] mb-2" />
                    <p className="text-xs font-bold text-white">{label}</p>
                    <p className="text-[10px] text-white/40 mt-1">Cliquer pour prévisualiser</p>
                  </button>
                ))}
              </div>
            </GlassCard>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-white/40 py-16">Aucun document trouvé</p>
      )}

      <AdminModal open={!!zoom} onClose={() => setZoom(null)} title={`${zoom?.label} — ${zoom?.name}`} wide>
        {zoom && (
          <div className="space-y-4">
            <img src={zoom.url} alt={zoom.label} className="w-full max-h-[70vh] object-contain rounded-xl" />
            <a
              href={zoom.url}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A84C] text-[#0B1623] font-bold text-sm"
            >
              <Download size={16} /> Télécharger
            </a>
          </div>
        )}
      </AdminModal>
    </motion.div>
  )
}
