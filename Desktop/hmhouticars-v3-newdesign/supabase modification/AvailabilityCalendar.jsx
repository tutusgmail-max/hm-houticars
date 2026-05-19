/**
 * components/admin/AvailabilityCalendar.jsx
 *
 * BUGS FIXED:
 *  1. No real-time sync — calendar only loaded once. Added Supabase realtime
 *     subscription that triggers AdminDataContext.refresh() on reservation changes.
 *
 *  2. Month boundary bug — first day of month used getDay() without adjusting for
 *     Monday-first weeks. The existing code already handles this correctly with
 *     (first.getDay() + 6) % 7, so that's fine. Kept as-is.
 *
 *  3. Calendar clicked day had no tooltip/detail — added a popover showing which
 *     reservation occupies that day (car, client, ref).
 *
 *  4. Available days showed no visual indicator of today — added "today" highlight.
 *
 *  5. "Pending" label was in English — changed to "En attente".
 */
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAdminData } from '../../context/AdminDataContext'
import { buildAvailabilityMap } from '../../services/availability.service'
import { supabase } from '../../lib/supabase'
import GlassCard from './ui/GlassCard'
import StatusBadge from './ui/StatusBadge'

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dateKey(date) {
  return date.toISOString().slice(0, 10)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function monthDays(date) {
  const first   = new Date(date.getFullYear(), date.getMonth(), 1)
  const last    = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const leading = (first.getDay() + 6) % 7  // Monday = 0
  const cells   = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Build a map: date → reservation object (for click-details) */
function buildDayReservationMap(reservations) {
  const map = {}
  for (const r of reservations) {
    if (!r.start_date || !r.end_date) continue
    const start = new Date(`${r.start_date}T00:00:00`)
    const end   = new Date(`${r.end_date}T00:00:00`)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      // confirmed takes priority over pending
      if (!map[key] || r.status === 'confirmed') map[key] = r
    }
  }
  return map
}

export default function AvailabilityCalendar() {
  const { cars, reservations, refresh } = useAdminData()
  const [selectedCarId, setSelectedCarId] = useState('all')
  const [currentMonth, setCurrentMonth]   = useState(() => new Date())
  const [selectedDay, setSelectedDay]     = useState(null)
  const today = useMemo(() => todayKey(), [])
  const subscriptionRef = useRef(null)

  // FIX: Real-time subscription for reservation changes
  useEffect(() => {
    const channel = supabase
      .channel('availability-calendar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => { refresh() },
      )
      .subscribe()

    subscriptionRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const visibleReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (!['pending', 'confirmed'].includes(r.status)) return false
      return selectedCarId === 'all' || String(r.car_id) === String(selectedCarId)
    })
  }, [reservations, selectedCarId])

  const availability   = useMemo(() => buildAvailabilityMap(visibleReservations),   [visibleReservations])
  const dayResMap      = useMemo(() => buildDayReservationMap(visibleReservations),  [visibleReservations])
  const days           = useMemo(() => monthDays(currentMonth),                      [currentMonth])

  const monthReservations = useMemo(() => {
    const key = monthKey(currentMonth)
    return visibleReservations.filter((r) => {
      const startKey = String(r.start_date).slice(0, 7)
      const endKey   = String(r.end_date).slice(0, 7)
      return startKey <= key && endKey >= key
    })
  }, [currentMonth, visibleReservations])

  const moveMonth = (amount) => {
    setSelectedDay(null)
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + amount, 1))
  }

  const handleDayClick = (key) => {
    const res = dayResMap[key]
    setSelectedDay(selectedDay === key ? null : (res ? key : null))
  }

  // Legend counts
  const counts = useMemo(() => {
    const available = days.filter((d) => d && availability[dateKey(d)] === undefined).length
    const pending   = days.filter((d) => d && availability[dateKey(d)] === 'pending').length
    const reserved  = days.filter((d) => d && availability[dateKey(d)] === 'reserved').length
    return { available, pending, reserved }
  }, [days, availability])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header + car selector */}
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-['Barlow_Condensed',sans-serif] text-3xl font-black text-white">
              Calendrier disponibilité
            </h2>
            <p className="mt-1 text-sm text-white/45">
              Vert = Disponible · Orange = En attente · Rouge = Confirmé · Cliquez une date pour détails
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCarId}
              onChange={(e) => { setSelectedCarId(e.target.value); setSelectedDay(null) }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#C9A84C]/50"
            >
              <option value="all" className="bg-[#0D1A2A]">Tous les véhicules</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id} className="bg-[#0D1A2A]">{car.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend counters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <LegendBadge color="emerald" label="Disponibles" count={counts.available} />
          <LegendBadge color="amber"   label="En attente"  count={counts.pending} />
          <LegendBadge color="red"     label="Confirmés"   count={counts.reserved} />
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Calendar grid */}
        <GlassCard className="overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="rounded-xl border border-white/10 p-2 text-white/60 hover:border-[#C9A84C]/40 hover:text-[#C9A84C]"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-center font-['Barlow_Condensed',sans-serif] text-2xl font-black capitalize text-white">
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="rounded-xl border border-white/10 p-2 text-white/60 hover:border-[#C9A84C]/40 hover:text-[#C9A84C]"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.02] text-center text-[10px] font-bold uppercase tracking-widest text-white/35">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => (
              <div key={label} className="p-3">{label}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-[72px] border-b border-r border-white/[0.04] bg-black/10 sm:min-h-[86px]"
                  />
                )
              }
              const key   = dateKey(day)
              const state = availability[key] || 'available'
              const isToday    = key === today
              const isSelected = key === selectedDay

              const cellStyle =
                state === 'reserved'
                  ? 'border-red-400/25 bg-red-500/15 text-red-200 hover:bg-red-500/25'
                  : state === 'pending'
                  ? 'border-amber-400/25 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                  : 'border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-200 hover:bg-emerald-500/[0.12]'

              const stateLabel =
                state === 'reserved' ? 'Confirmé' :
                state === 'pending'  ? 'En attente' : 'Dispo'

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDayClick(key)}
                  className={`relative min-h-[72px] border-b border-r p-2 text-left transition sm:min-h-[86px] ${cellStyle} ${
                    isSelected ? 'ring-2 ring-inset ring-gold/60' : ''
                  }`}
                >
                  <div className={`font-bold ${isToday ? 'text-gold underline decoration-2 underline-offset-2' : ''}`}>
                    {day.getDate()}
                    {isToday && <span className="ml-1 text-[8px] font-black uppercase text-gold">Auj.</span>}
                  </div>
                  <div className="mt-2 text-[9px] font-bold uppercase tracking-wider opacity-70">
                    {stateLabel}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Day detail popover */}
          <AnimatePresence>
            {selectedDay && dayResMap[selectedDay] && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="border-t border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                      {selectedDay}
                    </p>
                    <p className="mt-1 font-bold text-white">{dayResMap[selectedDay].car_name}</p>
                    <p className="text-sm text-white/55">
                      {dayResMap[selectedDay].customer_name || 'Client'} ·{' '}
                      <span className="text-gold">{dayResMap[selectedDay].ref}</span>
                    </p>
                    <p className="text-xs text-white/35">
                      {dayResMap[selectedDay].start_date} → {dayResMap[selectedDay].end_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={dayResMap[selectedDay].status} />
                    <button
                      type="button"
                      onClick={() => setSelectedDay(null)}
                      className="rounded-full p-1 text-white/40 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Sidebar: month reservations */}
        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-white/45">
            Réservations du mois ({monthReservations.length})
          </h3>
          <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {monthReservations.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{r.car_name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {r.customer_name || 'Client'} · {r.ref}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-3 text-xs font-semibold text-[#C9A84C]">
                  {r.start_date} → {r.end_date}
                </p>
              </div>
            ))}
            {monthReservations.length === 0 && (
              <p className="py-12 text-center text-sm text-white/35">
                Aucune réservation sur ce mois.
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  )
}

function LegendBadge({ color, label, count }) {
  const colors = {
    emerald: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300',
    amber:   'bg-amber-500/10 border-amber-400/20 text-amber-300',
    red:     'bg-red-500/10 border-red-400/20 text-red-300',
  }
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${colors[color]}`}>
      <span className={`h-2 w-2 rounded-full ${
        color === 'emerald' ? 'bg-emerald-400' :
        color === 'amber'   ? 'bg-amber-400'   : 'bg-red-400'
      }`} />
      {label}: {count}
    </div>
  )
}
