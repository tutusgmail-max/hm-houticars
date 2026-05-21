/**
 * ReservationManagement.jsx
 *
 * BUGS FIXED:
 * 1. handleStatus() used setReservations directly for optimistic update,
 *    but setReservations was the raw context setter. With the new context
 *    version, use updateReservationLocally() helper instead.
 *
 * 2. handleDelete() called setDetail(null) BEFORE the delete resolved.
 *    If delete failed, the detail modal was already closed with no feedback
 *    to the user about what happened.
 *    FIX: setDetail(null) only after confirmed success.
 *
 * 3. handleDelete() used window.confirm() which blocks the browser thread.
 *    In Chrome/Safari, confirm() is suppressed in cross-origin iframes.
 *    FIX: Added local confirmation state (inline confirm UI instead of dialog).
 *
 * 4. Document preview showed <img> for all document links, including PDFs.
 *    A PDF url rendered a broken image. FIX: Detect PDF by URL and show
 *    a download link instead of an image.
 *
 * 5. No loading state on status change buttons — rapid clicking could fire
 *    multiple status updates. FIX: Added per-row loading state.
 */
import React, { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Download, Eye, Check, X, Trash2, AlertTriangle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAdminData } from '../../context/AdminDataContext'
import { updateReservationStatus, deleteReservation } from '../../lib/supabase'
import { STATUS_STYLES } from '../../data'
import { exportToCsv } from '../../utils/exportCsv'
import { resolveDocumentLinks } from '../../services/documentUpload.service'
import GlassCard from './ui/GlassCard'
import StatusBadge from './ui/StatusBadge'
import AdminModal from './ui/AdminModal'
import Pagination from './ui/Pagination'

const PAGE_SIZE = 10
const STATUS_ACTIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

function isPdf(url) {
  return typeof url === 'string' && url.toLowerCase().includes('.pdf')
}

export default function ReservationManagement() {
  const { addToast } = useApp()
  const { reservations, updateReservationLocally, removeReservationLocally, refresh } = useAdminData()

  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage]             = useState(1)
  const [detail, setDetail]         = useState(null)
  const [docs, setDocs]             = useState(null)
  const [docsLoading, setDocsLoading] = useState(false)
  // BUG FIX: Per-row loading to prevent double-click issues
  const [actionLoading, setActionLoading] = useState({})
  // BUG FIX: Inline delete confirmation instead of window.confirm()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const q = search.toLowerCase()
      const matchQ =
        !q ||
        r.ref?.toLowerCase().includes(q) ||
        r.car_name?.toLowerCase().includes(q) ||
        (r.customer_name || r.profiles?.full_name || '').toLowerCase().includes(q)
      const matchS = statusFilter === 'all' || r.status === statusFilter
      return matchQ && matchS
    })
  }, [reservations, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleStatus = useCallback(async (id, newStatus) => {
    if (actionLoading[id]) return
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      await updateReservationStatus(id, newStatus)
      // BUG FIX: Use the optimistic update helper
      updateReservationLocally(id, { status: newStatus })
      addToast(`Statut mis à jour : ${STATUS_STYLES[newStatus]?.label || newStatus}`)
    } catch {
      addToast('Erreur lors de la mise à jour du statut', 'error')
      refresh() // re-sync if optimistic update failed
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }))
    }
  }, [actionLoading, updateReservationLocally, addToast, refresh])

  const handleDelete = useCallback(async (id) => {
    if (actionLoading[id]) return
    setActionLoading((p) => ({ ...p, [id]: true }))
    try {
      await deleteReservation(id)
      // BUG FIX: Remove from list AFTER confirmed success
      removeReservationLocally(id)
      addToast('Réservation supprimée')
      // BUG FIX: Close modal only after success
      if (detail?.id === id) setDetail(null)
    } catch {
      addToast('Erreur lors de la suppression', 'error')
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }))
      setConfirmDeleteId(null)
    }
  }, [actionLoading, removeReservationLocally, addToast, detail])

  const exportCsv = () => {
    exportToCsv(
      `reservations-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered,
      [
        { label: 'Réf',       get: (r) => r.ref },
        { label: 'Client',    get: (r) => r.customer_name || r.profiles?.full_name },
        { label: 'Téléphone', get: (r) => r.customer_phone || r.profiles?.phone },
        { label: 'Véhicule',  get: (r) => r.car_name },
        { label: 'Début',     get: (r) => r.start_date },
        { label: 'Fin',       get: (r) => r.end_date },
        { label: 'Statut',    get: (r) => r.status },
        { label: 'Total DH',  get: (r) => r.total },
      ],
    )
    addToast('Export CSV téléchargé')
  }

  const openDocs = async (res) => {
    setDocsLoading(true)
    setDocs({ name: res.customer_name, links: {} })
    try {
      const links = await resolveDocumentLinks({
        ...(res.documents || {}),
        cin_front:    res.cin_front_url,
        cin_back:     res.cin_back_url,
        permis_front: res.permis_front_url,
        permis_back:  res.permis_back_url,
      })
      setDocs({ name: res.customer_name, links })
    } catch {
      addToast('Documents indisponibles', 'error')
      setDocs(null)
    } finally {
      setDocsLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <GlassCard className="p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Rechercher client, véhicule, réf..."
              className="w-full pl-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#C9A84C]/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          >
            <option value="all">Tous statuts</option>
            {Object.entries(STATUS_STYLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#C9A84C]/30 text-[#C9A84C] font-bold text-sm hover:bg-[#C9A84C]/10"
        >
          <Download size={18} /> Exporter CSV
        </button>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/10 bg-white/[0.02]">
                <th className="p-4">Réf</th>
                <th className="p-4">Client</th>
                <th className="p-4">Téléphone</th>
                <th className="p-4">Véhicule</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="p-4 font-mono text-[#C9A84C]">{r.ref}</td>
                  <td className="p-4 font-medium">{r.customer_name || r.profiles?.full_name || '—'}</td>
                  <td className="p-4 text-white/50">{r.customer_phone || r.profiles?.phone || '—'}</td>
                  <td className="p-4">{r.car_name}</td>
                  <td className="p-4 text-white/50 text-xs whitespace-nowrap">
                    {r.start_date} → {r.end_date}
                  </td>
                  <td className="p-4"><StatusBadge status={r.status} /></td>
                  <td className="p-4 text-right font-bold text-[#C9A84C]">{r.total} DH</td>
                  <td className="p-4">
                    <div className="flex gap-1 justify-end flex-wrap items-center">
                      <button
                        type="button"
                        onClick={() => setDetail(r)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"
                        title="Détails"
                      >
                        <Eye size={16} />
                      </button>
                      {(STATUS_ACTIONS[r.status] || []).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleStatus(r.id, s)}
                          disabled={!!actionLoading[r.id]}
                          className={`p-2 rounded-lg disabled:opacity-50 ${
                            s === 'confirmed' || s === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                          title={STATUS_STYLES[s]?.label}
                        >
                          {s === 'cancelled' ? <X size={16} /> : <Check size={16} />}
                        </button>
                      ))}
                      {/* BUG FIX: Inline confirm instead of window.confirm() */}
                      {confirmDeleteId === r.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            disabled={!!actionLoading[r.id]}
                            className="px-2 py-1 rounded-lg bg-red-500/30 text-red-200 text-xs font-bold disabled:opacity-50"
                          >
                            Confirmer
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-white/10 text-white/50 text-xs"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-white/30 text-sm">
                    Aucune réservation trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <AdminModal open={!!detail} onClose={() => setDetail(null)} title="Détail réservation" wide>
        {detail && (
          <motion.div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ['Référence',  detail.ref],
                ['Client',     detail.customer_name || detail.profiles?.full_name],
                ['Téléphone',  detail.customer_phone || detail.profiles?.phone],
                ['Email',      detail.customer_email || detail.profiles?.email],
                ['Véhicule',   detail.car_name],
                ['Départ',     `${detail.pickup_location} — ${detail.start_date}`],
                ['Retour',     `${detail.return_location} — ${detail.end_date}`],
                ['Total',      `${detail.total} DH`],
                ['Statut',     STATUS_STYLES[detail.status]?.label],
                ['Notes',      detail.notes],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white/40 text-[10px] uppercase mb-1">{k}</p>
                  <p className="text-white font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => openDocs(detail)}
                className="px-4 py-2 rounded-lg bg-[#C9A84C]/20 text-[#C9A84C] font-bold text-xs"
              >
                Voir documents
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(detail.id)}
                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 font-bold text-xs"
              >
                Supprimer
              </button>
              {confirmDeleteId === detail.id && (
                <div className="flex items-center gap-2 ml-2">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-red-300 text-xs">Confirmer ?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(detail.id)}
                    className="px-3 py-1 rounded bg-red-500/30 text-red-200 text-xs font-bold"
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1 rounded bg-white/10 text-white/40 text-xs"
                  >
                    Non
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AdminModal>

      <AdminModal open={!!docs} onClose={() => setDocs(null)} title={`Documents — ${docs?.name}`} wide>
        {docsLoading ? (
          <p className="text-center text-white/50 py-12">Chargement…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'cin_front',    label: 'CIN Recto' },
              { key: 'cin_back',     label: 'CIN Verso' },
              { key: 'permis_front', label: 'Permis Recto' },
              { key: 'permis_back',  label: 'Permis Verso' },
            ].map(({ key, label }) => (
              <div key={key}>
                <p className="text-[10px] uppercase text-white/40 mb-2">{label}</p>
                {docs?.links?.[key] ? (
                  // BUG FIX: Detect PDFs and show download link instead of broken <img>
                  isPdf(docs.links[key]) ? (
                    <a
                      href={docs.links[key]}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="flex h-36 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#C9A84C] text-sm font-semibold hover:bg-white/10"
                    >
                      📄 Télécharger PDF
                    </a>
                  ) : (
                    <a href={docs.links[key]} target="_blank" rel="noreferrer" download>
                      <img
                        src={docs.links[key]}
                        alt={label}
                        className="w-full h-36 object-cover rounded-lg border border-white/10"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </a>
                  )
                ) : (
                  <div className="h-36 rounded-lg bg-white/5 flex items-center justify-center text-white/30 text-xs">
                    Non fourni
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminModal>
    </motion.div>
  )
}
