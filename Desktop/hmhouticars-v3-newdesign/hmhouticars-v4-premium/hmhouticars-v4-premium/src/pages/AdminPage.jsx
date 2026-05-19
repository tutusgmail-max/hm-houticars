import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiUsers, FiCalendar, FiCheck, FiX, FiEye, FiRefreshCw, FiTruck, FiTrash2 } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { getAllReservations, getAllProfiles, updateReservationStatus, deleteReservation } from '../lib/supabase'
import { STATUS_STYLES } from '../data'
import AdminFleetPanel from '../components/admin/AdminFleetPanel'
import { resolveDocumentLinks } from '../services/documentUpload.service'

const TABS = [
  { id: 'reservations', label: 'Réservations', icon: FiCalendar },
  { id: 'fleet',        label: 'Flotte',         icon: FiTruck },
  { id: 'users',        label: 'Clients',       icon: FiUsers },
]

const STATUS_ACTIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  completed: [],
  cancelled: [],
}

export default function AdminPage() {
  const { addToast } = useApp()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('reservations')
  const [reservations, setReservations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [docModal, setDocModal] = useState(null) // { docs, name }
  const [docModalLoading, setDocModalLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!user || !isAdmin) { navigate('/'); return }
    fetchAll()
  }, [user, isAdmin])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [res, prof] = await Promise.all([getAllReservations(), getAllProfiles()])
      setReservations(res)
      setUsers(prof)
    } catch {
      setReservations([])
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateReservationStatus(id, newStatus)
      setReservations(prev =>
        prev.map(r => r.id === id ? { ...r, status: newStatus } : r)
      )
      addToast(`Statut mis à jour: ${STATUS_STYLES[newStatus]?.label}`)
    } catch {
      addToast('Erreur lors de la mise à jour.', 'error')
    }
  }

  const handleDeleteReservation = async (id) => {
    if (!window.confirm('Supprimer cette réservation définitivement ?')) return
    try {
      await deleteReservation(id)
      setReservations((prev) => prev.filter((r) => r.id !== id))
      addToast('Réservation supprimée')
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    }
  }

  const filtered = statusFilter === 'all'
    ? reservations
    : reservations.filter(r => r.status === statusFilter)

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    revenue: reservations.filter(r => r.status !== 'cancelled').reduce((s, r) => s + (r.total || 0), 0),
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen bg-[#F5F6F8] pt-[108px]">
      {/* Header */}
      <div className="bg-navy text-white px-4 sm:px-10 py-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div>
              <div className="section-label">Administration</div>
              <h1 className="font-condensed font-black text-white text-[2rem]">
                Tableau de bord Admin
              </h1>
            </div>
            <button
              onClick={fetchAll}
              className="flex items-center gap-2 bg-white/[0.08] text-white font-semibold
                text-[13px] px-4 py-2.5 rounded-[10px] border border-white/20 cursor-pointer
                transition-all hover:bg-white/[0.15]"
            >
              <FiRefreshCw /> Actualiser
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total réservations', value: stats.total, icon: '📋' },
              { label: 'En attente',          value: stats.pending, icon: '⏳' },
              { label: 'Confirmées',          value: stats.confirmed, icon: '✅' },
              { label: 'Revenus (DH)',        value: stats.revenue.toLocaleString(), icon: '💰' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white/[0.06] border border-white/[0.08] rounded-[14px] p-5">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-condensed font-black text-gold text-[1.8rem] leading-none">{value}</div>
                <div className="text-text-muted text-[12px] mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-8 bg-white/[0.07] rounded-xl p-1 w-fit">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-semibold text-[13px]
                  cursor-pointer transition-all duration-200 border-none
                  ${tab === id ? 'bg-gold text-navy' : 'text-white/60 hover:text-white bg-transparent'}`}
              >
                <Icon className="text-[14px]" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-10 py-10">

        {/* ─── RESERVATIONS ─── */}
        {tab === 'reservations' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Status filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-full text-[12px] font-semibold cursor-pointer border
                    transition-all duration-200
                    ${statusFilter === s
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-text-muted border-[#dde1e8] hover:border-navy hover:text-navy'}`}
                >
                  {s === 'all' ? 'Toutes' : STATUS_STYLES[s]?.label}
                  {s !== 'all' && (
                    <span className="ml-1.5 bg-black/10 px-1.5 py-0.5 rounded-full text-[10px]">
                      {reservations.filter(r => r.status === s).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-[16px] p-12 text-center border border-black/[0.06]">
                <div className="text-4xl mb-3">📋</div>
                <div className="font-bold text-navy">Aucune réservation trouvée</div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filtered.map((res) => {
                  const status = STATUS_STYLES[res.status] || STATUS_STYLES.pending
                  const actions = STATUS_ACTIONS[res.status] || []
                  const hasDocs = res.documents && Object.values(res.documents).some(Boolean)

                  return (
                    <motion.div
                      key={res.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-[16px] p-6 border border-black/[0.06]
                        shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-condensed font-black text-navy text-[1.15rem]">
                              {res.car_name}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="text-text-muted text-[12px] mt-0.5">
                            Réf: <strong className="text-navy">{res.ref}</strong> ·{' '}
                            {new Date(res.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div className="font-condensed font-black text-gold text-[1.4rem]">
                          {res.total} DH
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <AdminInfo label="Client" value={res.customer_name || res.profiles?.full_name || '—'} />
                        <AdminInfo label="Téléphone" value={res.customer_phone || res.profiles?.phone || '—'} />
                        <AdminInfo label="Départ" value={`${res.pickup_location} – ${res.start_date}`} />
                        <AdminInfo label="Retour" value={`${res.return_location} – ${res.end_date}`} />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap items-center pt-4 border-t border-[#f0f2f5]">
                        {actions.map(newStatus => {
                          const s = STATUS_STYLES[newStatus]
                          const isPositive = newStatus === 'confirmed' || newStatus === 'completed'
                          return (
                            <button
                              key={newStatus}
                              onClick={() => handleStatusChange(res.id, newStatus)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[12px]
                                font-bold cursor-pointer border-none transition-all
                                ${isPositive
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                              {isPositive ? <FiCheck /> : <FiX />}
                              {s?.label}
                            </button>
                          )
                        })}

                        <button
                          type="button"
                          onClick={() => handleDeleteReservation(res.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[12px] font-bold cursor-pointer border-none bg-red-50 text-red-700 hover:bg-red-100 transition-all"
                        >
                          <FiTrash2 /> Supprimer
                        </button>

                        {hasDocs && (
                          <button
                            onClick={async () => {
                              setDocModalLoading(true)
                              setDocModal({ docs: {}, name: res.customer_name })
                              try {
                                const links = await resolveDocumentLinks({
                                  ...(res.documents || {}),
                                  cin_front: res.cin_front_url,
                                  cin_back: res.cin_back_url,
                                  permis_front: res.permis_front_url,
                                  permis_back: res.permis_back_url,
                                })
                                setDocModal({ docs: links, name: res.customer_name })
                              } catch {
                                addToast('Impossible de charger les documents.', 'error')
                                setDocModal(null)
                              } finally {
                                setDocModalLoading(false)
                              }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[12px]
                              font-bold cursor-pointer border-none bg-navy/10 text-navy
                              hover:bg-navy/20 transition-all ml-auto"
                          >
                            <FiEye /> Voir documents
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'fleet' && <AdminFleetPanel />}

        {/* ─── USERS ─── */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-condensed font-black text-navy text-[1.5rem] mb-6">
              Clients enregistrés
            </h2>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-[16px] border border-black/[0.06] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F5F6F8] border-b border-[#e0e4ea]">
                      <tr>
                        {['Client', 'Email', 'Téléphone', 'Rôle', 'Inscrit le'].map(h => (
                          <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold
                            text-text-muted uppercase tracking-[1px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={u.id} className={`border-b border-[#f0f2f5] last:border-0
                          ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gold text-navy rounded-full flex items-center
                                justify-center font-black text-[13px] flex-shrink-0">
                                {u.full_name?.charAt(0) || '?'}
                              </div>
                              <span className="font-semibold text-navy text-sm">{u.full_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-text-muted text-sm">{u.email}</td>
                          <td className="px-5 py-4 text-text-muted text-sm">{u.phone || '—'}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold
                              ${u.role === 'admin' ? 'bg-gold/20 text-gold-dark' : 'bg-blue-100 text-blue-700'}`}>
                              {u.role === 'admin' ? '👑 Admin' : '👤 Client'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-text-muted text-sm">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Document viewer modal */}
      {docModal && (
        <div
          className="fixed inset-0 bg-black/75 z-[700] flex items-center justify-center p-4"
          onClick={() => setDocModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-[20px] max-w-[600px] w-full p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-condensed font-black text-navy text-[1.3rem]">
                Documents — {docModal.name}
              </h3>
              <button
                onClick={() => setDocModal(null)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center
                  cursor-pointer border-none hover:bg-gray-200 transition-colors"
              >
                <FiX />
              </button>
            </div>
            {docModalLoading ? (
              <div className="py-12 text-center text-text-muted">Chargement des documents…</div>
            ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'cin_front', label: 'CIN Recto' },
                { key: 'cin_back', label: 'CIN Verso' },
                { key: 'permis_front', label: 'Permis Recto' },
                { key: 'permis_back', label: 'Permis Verso' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <div className="text-[11px] font-bold text-text-muted uppercase tracking-[1px] mb-2">
                    {label}
                  </div>
                  {docModal.docs[key] ? (
                    <a href={docModal.docs[key]} target="_blank" rel="noreferrer">
                      <img
                        src={docModal.docs[key]}
                        alt={label}
                        className="w-full h-32 object-cover rounded-[10px] border border-gray-200
                          hover:opacity-90 transition-opacity cursor-zoom-in"
                      />
                    </a>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-[10px] flex items-center
                      justify-center text-text-muted text-sm">
                      Non fourni
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}

function AdminInfo({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-text-muted font-bold uppercase tracking-[1px] mb-0.5">{label}</div>
      <div className="text-[13px] text-navy font-semibold truncate">{value}</div>
    </div>
  )
}
