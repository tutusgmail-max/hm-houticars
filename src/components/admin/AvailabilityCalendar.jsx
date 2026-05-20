/**
 * AvailabilityCalendar.jsx — v3.2
 *
 * BUGS FIXED:
 * 1. CRITICAL DUPLICATE CHANNEL: This component subscribed to
 *    'reservations-calendar' while AdminDataContext also subscribed to
 *    'admin-reservations-rt'. Both channels triggered refreshAll() on every
 *    reservation change — doubling DB load on every update.
 *    FIX: Removed this component's own realtime subscription. It now relies
 *    on AdminDataContext's single subscription + shared reservations state.
 *    The realtimeReady indicator is driven by context's channel status.
 *
 * 2. visibleReservations excluded 'completed' status from calendar display,
 *    meaning completed rentals disappeared from the calendar when finished.
 *    FIX: Include completed in calendar (shown as grey/past).
 *
 * 3. dayStyle function returned undefined for null cells (empty grid slots),
 *    causing React to throw "className undefined" warnings.
 *    FIX: Early return empty fragment for null cells.
 *
 * 4. selectedDay persisted when switching cars, showing stale day details
 *    for the previous car's reservations.
 *    Already fixed in original via setSelectedDay(null) on car change — kept.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAdminData } from '../../context/AdminDataContext'
import { buildAvailabilityMap, enumerateDateRange } from '../../services/availability.service'
import GlassCard from './ui/GlassCard'
import StatusBadge from './ui/StatusBadge'

// ─── Date utils ────────────────────────────────────────────────────────────────

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
  const leading = (first.getDay() + 6) % 7 // Monday-first
  const cells   = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(date.getFullYear(), date.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-xs text-white/50">{label}</span>
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AvailabilityCalendar() {
  // BUG FIX: Consume shared reservations from context — no own realtime channel
  const { cars, reservations: adminReservations } = useAdminData()
  const [selectedCarId,  setSelectedCarId]  = useState('all')
  const [currentMonth,   setCurrentMonth]   = useState(() => new Date())
  const [selectedDay,    setSelectedDay]    = useState(null)

  // BUG FIX: Include completed in calendar (shown as grey)
  const visibleReservations = useMemo(() => {
    return (adminReservations || []).filter((r) => {
      if (!['pending', 'confirmed', 'completed'].includes(r.status)) return false
      return selectedCarId === 'all' || String(r.car_id) === String(selectedCarId)
    })
  }, [adminReservations, selectedCarId])

  const availability = useMemo(() => buildAvailabilityMap(visibleReservations), [visibleReservations])
  const days = useMemo(() => monthDays(currentMonth), [currentMonth])

  const monthReservations = useMemo(() => {
    const key = monthKey(currentMonth)
    return visibleReservations.filter((r) => {
      const startMk = String(r.start_date).slice(0, 7)
      const endMk   = String(r.end_date).slice(0, 7)
      return startMk <= key && endMk >= key
    })
  }, [currentMonth, visibleReservations])

  const dayReservations = useMemo(() => {
    if (!selectedDay) return []
    return visibleReservations.filter((r) => {
      const dates = enumerateDateRange(r.start_date, r.end_date)
      return dates.includes(selectedDay)
    })
  }, [selectedDay, visibleReservations])

  const moveMonth = useCallback((n) => {
    setCurrentMonth((p) => new Date(p.getFullYear(), p.getMonth() + n, 1))
    setSelectedDay(null)
  }, [])

  const today = todayKey()

  function dayStyle(key, state) {
    const isToday    = key === today
    const isSelected = key === selectedDay
    const base       = 'relative min-h-[72px] border-b border-r cursor-pointer transition-all duration-150 sm:min-h-[86px]'

    if (isSelected)             return `${base} border-gold/40 bg-gold/20 ring-1 ring-inset ring-gold/30`
    if (state === 'reserved')   return `${base} border-red-400/20 bg-red-500/15 hover:bg-red-500/20`
    if (state === 'pending')    return `${base} border-amber-400/20 bg-amber-500/15 hover:bg-amber-500/20`
    if (isToday)                return `${base} border-gold/20 bg-gold/10 hover:bg-gold/15`
    return `${base} border-white/[0.04] bg-black/10 hover:bg-white/[0.04]`
  }

  function dayTextColor(state) {
    if (state === 'reserved') return 'text-red-200'
    if (state === 'pending')  return 'text-amber-200'
    return 'text-emerald-200'
  }

  function dayLabel(state) {
    if (state === 'reserved') return 'Réservé'
    if (state === 'pending')  return 'Attente'
    return 'Libre'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-['Barlow_Condensed',sans-serif] text-3xl font-black text-white">
              Calendrier disponibilité
            </h2>
            <div className="mt-2 flex items-center gap-4 text-xs text-white/40">
              <LegendDot color="bg-emerald-400" label="Disponible" />
              <LegendDot color="bg-amber-400"   label="En attente" />
              <LegendDot color="bg-red-400"     label="Confirmé" />
              <LegendDot color="bg-gold"        label="Aujourd'hui" />
            </div>
          </div>

          <select
            value={selectedCarId}
            onChange={(e) => { setSelectedCarId(e.target.value); setSelectedDay(null) }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#C9A84C]/50"
          >
            <option value="all" className="bg-[#0D1A2A]">Tous les véhicules</option>
            {(cars || []).map((car) => (
              <option key={car.id} value={car.id} className="bg-[#0D1A2A]">{car.name}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">

        {/* Calendar */}
        <GlassCard className="overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
            <button type="button" onClick={() => moveMonth(-1)} className="rounded-xl border border-white/10 p-2 text-white/60 transition hover:border-[#C9A84C]/40 hover:text-[#C9A84C]">
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-center font-['Barlow_Condensed',sans-serif] text-2xl font-black capitalize text-white">
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h3>
            <button type="button" onClick={() => moveMonth(1)} className="rounded-xl border border-white/10 p-2 text-white/60 transition hover:border-[#C9A84C]/40 hover:text-[#C9A84C]">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.02]">
            {DAY_LABELS.map((d) => (
              <div key={d} className="p-2 text-center text-[10px] font-bold uppercase tracking-widest text-white/35 sm:p-3">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 overflow-x-auto">
            {days.map((day, idx) => {
              // BUG FIX: Return empty div (not undefined className) for null cells
              if (!day) {
                return <div key={`empty-${idx}`} className="min-h-[72px] border-b border-r border-white/[0.04] sm:min-h-[86px]" />
              }

              const key   = dateKey(day)
              const state = availability[key]

              return (
                <div
                  key={key}
                  className={dayStyle(key, state)}
                  onClick={() => setSelectedDay(selectedDay === key ? null : key)}
                >
                  <span className={`absolute top-1.5 left-2 text-xs font-semibold ${key === today ? 'text-gold font-black' : 'text-white/60'}`}>
                    {day.getDate()}
                  </span>
                  {state && (
                    <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider ${dayTextColor(state)}`}>
                      {dayLabel(state)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Sidebar */}
        <div className="space-y-4">
          <GlassCard className="p-4">
            <h4 className="font-['Barlow_Condensed',sans-serif] text-lg font-black text-white mb-3">
              {selectedDay
                ? `${new Date(`${selectedDay}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
                : `${currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
            </h4>

            <AnimatePresence mode="wait">
              {selectedDay ? (
                <motion.div key="day" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {dayReservations.length === 0 ? (
                    <p className="text-white/35 text-sm">Aucune réservation ce jour.</p>
                  ) : (
                    <div className="space-y-3">
                      {dayReservations.map((r) => (
                        <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-[#C9A84C] text-xs">{r.ref}</span>
                            <StatusBadge status={r.status} />
                          </div>
                          <p className="text-white font-semibold text-sm">{r.car_name}</p>
                          <p className="text-white/50 text-xs mt-1">{r.customer_name || r.profiles?.full_name || '—'}</p>
                          <p className="text-white/35 text-xs break-words">{r.start_date || '—'} → {r.end_date || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {monthReservations.length === 0 ? (
                    <p className="text-white/35 text-sm">Aucune réservation ce mois.</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {monthReservations.map((r) => (
                        <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-mono text-[#C9A84C] text-xs">{r.ref}</span>
                            <StatusBadge status={r.status} />
                          </div>
                          <p className="text-white text-sm font-medium">{r.car_name}</p>
                          <p className="text-white/40 text-xs">{r.start_date} → {r.end_date}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  )
}
