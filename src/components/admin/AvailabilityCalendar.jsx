import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAdminData } from '../../context/AdminDataContext'
import { buildAvailabilityMap } from '../../services/availability.service'
import GlassCard from './ui/GlassCard'
import StatusBadge from './ui/StatusBadge'

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dateKey(date) {
  return date.toISOString().slice(0, 10)
}

function monthDays(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const leading = (first.getDay() + 6) % 7
  const cells = []

  for (let i = 0; i < leading; i += 1) cells.push(null)
  for (let day = 1; day <= last.getDate(); day += 1) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function AvailabilityCalendar() {
  const { cars, reservations } = useAdminData()
  const [selectedCarId, setSelectedCarId] = useState('all')
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  const visibleReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (!['pending', 'confirmed'].includes(reservation.status)) return false
      return selectedCarId === 'all' || String(reservation.car_id) === String(selectedCarId)
    })
  }, [reservations, selectedCarId])

  const availability = useMemo(() => buildAvailabilityMap(visibleReservations), [visibleReservations])
  const days = useMemo(() => monthDays(currentMonth), [currentMonth])

  const monthReservations = useMemo(() => {
    const key = monthKey(currentMonth)
    return visibleReservations.filter((reservation) => {
      const startKey = String(reservation.start_date).slice(0, 7)
      const endKey = String(reservation.end_date).slice(0, 7)
      return startKey <= key && endKey >= key
    })
  }, [currentMonth, visibleReservations])

  const moveMonth = (amount) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + amount, 1))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-['Barlow_Condensed',sans-serif] text-3xl font-black text-white">Calendrier disponibilité</h2>
            <p className="mt-1 text-sm text-white/45">Vert disponible · Orange en attente · Rouge confirmé</p>
          </div>
          <select
            value={selectedCarId}
            onChange={(event) => setSelectedCarId(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#C9A84C]/50"
          >
            <option value="all" className="bg-[#0D1A2A]">Tous les véhicules</option>
            {cars.map((car) => (
              <option key={car.id} value={car.id} className="bg-[#0D1A2A]">{car.name}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
            <button type="button" onClick={() => moveMonth(-1)} className="rounded-xl border border-white/10 p-2 text-white/60 hover:border-[#C9A84C]/40 hover:text-[#C9A84C]">
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-center font-['Barlow_Condensed',sans-serif] text-2xl font-black capitalize text-white">
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h3>
            <button type="button" onClick={() => moveMonth(1)} className="rounded-xl border border-white/10 p-2 text-white/60 hover:border-[#C9A84C]/40 hover:text-[#C9A84C]">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.02] text-center text-[10px] font-bold uppercase tracking-widest text-white/35">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => (
              <div key={label} className="p-3">{label}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              if (!day) return <div key={`blank-${index}`} className="min-h-[86px] border-b border-r border-white/[0.04] bg-black/10" />
              const key = dateKey(day)
              const state = availability[key] || 'available'
              const style =
                state === 'reserved'
                  ? 'border-red-400/25 bg-red-500/15 text-red-200'
                  : state === 'pending'
                    ? 'border-amber-400/25 bg-amber-500/15 text-amber-200'
                    : 'border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-200'

              return (
                <div key={key} className={`min-h-[86px] border-b border-r p-2 transition ${style}`}>
                  <div className="font-bold">{day.getDate()}</div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {state === 'reserved' ? 'Réservé' : state === 'pending' ? 'Pending' : 'Dispo'}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-white/45">Réservations du mois</h3>
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {monthReservations.map((reservation) => (
              <div key={reservation.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{reservation.car_name}</p>
                    <p className="mt-1 text-xs text-white/45">{reservation.customer_name || 'Client'} · {reservation.ref}</p>
                  </div>
                  <StatusBadge status={reservation.status} />
                </div>
                <p className="mt-3 text-xs font-semibold text-[#C9A84C]">{reservation.start_date} → {reservation.end_date}</p>
              </div>
            ))}
            {monthReservations.length === 0 && <p className="py-12 text-center text-sm text-white/35">Aucune réservation sur ce mois.</p>}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  )
}
