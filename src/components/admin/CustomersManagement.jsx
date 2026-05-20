import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, User } from 'lucide-react'
import { useAdminData } from '../../context/AdminDataContext'
import GlassCard from './ui/GlassCard'
import AdminModal from './ui/AdminModal'
import StatusBadge from './ui/StatusBadge'
import Pagination from './ui/Pagination'

const PAGE_SIZE = 12

export default function CustomersManagement() {
  const { users, reservations } = useAdminData()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const clients = useMemo(() => users.filter((u) => u.role !== 'admin'), [users])

  const enriched = useMemo(() => {
    return clients.map((u) => {
      const userRes = reservations.filter((r) => r.user_id === u.id)
      return {
        ...u,
        rentalCount: userRes.length,
        totalSpent: userRes.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (Number(r.total) || 0), 0),
        history: userRes,
      }
    })
  }, [clients, reservations])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enriched.filter(
      (u) =>
        !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q),
    )
  }, [enriched, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <GlassCard className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Rechercher par nom, email, téléphone..."
            className="w-full pl-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none"
          />
        </div>
      </GlassCard>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paged.length === 0 && (
          <GlassCard className="p-8 col-span-full text-center text-white/35 text-sm">
            Aucun client trouvé
          </GlassCard>
        )}
        {paged.map((u) => (
          <GlassCard
            key={u.id}
            hover
            className="p-5 cursor-pointer"
            onClick={() => setSelected(u)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E8C76A] flex items-center justify-center text-[#0B1623] font-black">
                {u.full_name?.charAt(0) || <User size={20} />}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{u.full_name || '—'}</p>
                <p className="text-xs text-white/45 truncate">{u.email}</p>
              </div>
            </div>
            <motion.div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-lg font-black text-[#C9A84C]">{u.rentalCount}</p>
                <p className="text-[10px] text-white/40 uppercase">Locations</p>
              </div>
              <div>
                <p className="text-lg font-black text-white">{u.totalSpent.toLocaleString()}</p>
                <p className="text-[10px] text-white/40 uppercase">DH total</p>
              </div>
            </motion.div>
          </GlassCard>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <AdminModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.full_name || 'Client'}
        wide
      >
        {selected && (
          <div className="space-y-6 text-sm">
            <motion.div className="grid sm:grid-cols-2 gap-3">
              {[
                ['Email', selected.email],
                ['Téléphone', selected.phone || '—'],
                ['Inscrit le', selected.created_at ? new Date(selected.created_at).toLocaleDateString('fr-FR') : '—'],
                ['Locations', selected.rentalCount],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white/40 text-[10px] uppercase">{k}</p>
                  <p className="text-white font-semibold">{v}</p>
                </div>
              ))}
            </motion.div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/45 mb-3">
                Historique réservations
              </h4>
              {selected.history?.length ? (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {selected.history.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/10"
                    >
                      <div>
                        <p className="font-semibold text-white">{r.car_name}</p>
                        <p className="text-xs text-white/40">
                          {r.start_date} → {r.end_date}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={r.status} />
                        <p className="text-[#C9A84C] font-bold mt-1">{r.total} DH</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/40">Aucune réservation</p>
              )}
            </div>
          </div>
        )}
      </AdminModal>
    </motion.div>
  )
}
