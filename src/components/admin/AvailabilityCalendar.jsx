/**
 * AvailabilityCalendar.jsx — v3.1 FIXED
 *
 * BUGS FIXED:
 * 1. No realtime update — subscribes to Supabase realtime channel
 * 2. "All cars" mode showed merged incorrectly — per-car status preserved
 * 3. Calendar day click did nothing — now shows reservation details
 * 4. No month navigation labels — added proper localized month/year
 * 5. Mobile overflow — responsive scrollable grid
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useAdminData } from '../../context/AdminDataContext'
import { buildAvailabilityMap, enumerateDateRange } from '../../services/availability.service'
import { supabase } from '../../lib/supabase'
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
  const leading = (first.getDay() + 6) % 7  // Monday-first
  const cells   = []

  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(date.getFullYear(), date.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// ─── Main component ────────────────────────────────────────────────────────────

export default function AvailabilityCalendar() {
  const { cars, reservations: adminReservations, refreshAll } = useAdminData()
  const [selectedCarId,  setSelectedCarId]  = useState('all')
  const [currentMonth,   setCurrentMonth]   = useState(() => new Date())
  const [selectedDay,    setSelectedDay]    = useState(null) // YYYY-MM-DD
  const [realtimeReady,  setRealtimeReady]  = useState(false)

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('reservations-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        refreshAll?.()
      })
      .subscribe((status) => {
        setRealtimeReady(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [refreshAll])

  // ── Filtered reservations ──────────────────────────────────────────────────
  const visibleReservations = useMemo(() => {
    return (adminReservations || []).filter((r) => {
      if (!['pending', 'confirmed'].includes(r.status)) return false
      return selectedCarId === 'all' || String(r.car_id) === String(selectedCarId)
    })
  }, [adminReservations, selectedCarId])

  // ── Availability map { 'YYYY-MM-DD': 'available' | 'pending' | 'reserved' } ──
  const availability = useMemo(() => buildAvailabilityMap(visibleReservations), [visibleReservations])

  const days = useMemo(() => monthDays(currentMonth), [currentMonth])

  // ── Month reservations (for sidebar) ──────────────────────────────────────
  const monthReservations = useMemo(() => {
    const key = monthKey(currentMonth)
    return visibleReservations.filter((r) => {
      const startMk = String(r.start_date).slice(0, 7)
      const endMk   = String(r.end_date).slice(0, 7)
      return startMk <= key && endMk >= key
    })
  }, [currentMonth, visibleReservations])

  // ── Day reservations (for detail panel) ──────────────────────────────────
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

  // ── Day cell style ─────────────────────────────────────────────────────────
  function dayStyle(key, state) {
    const isToday    = key === today
    const isSelected = key === selectedDay
    const base       = 'relative min-h-[72px] border-b border-r cursor-pointer transition-all duration-150 sm:min-h-[86px]'

    if (isSelected) return `${base} border-gold/40 bg-gold/20 ring-1 ring-inset ring-gold/30`
    if (state === 'reserved')  return `${base} border-red-400/20 bg-red-500/15 hover:bg-red-500/20`
    if (state === 'pending')   return `${base} border-amber-400/20 bg-amber-500/15 hover:bg-amber-500/20`
    if (isToday)               return `${base} border-gold/20 bg-gold/10 hover:bg-gold/15`
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
            <div className="flex items-center gap-3">
              <h2 className="font-['Barlow_Condensed',sans-serif] text-3xl font-black text-white">Calendrier disponibilité</h2>
              {realtimeReady && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Temps réel
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-white/40">
              <LegendDot color="bg-emerald-400" label="Disponible" />
              <LegendDot color="bg-amber-400"   label="En attente" />
              <LegendDot color="bg-red-400"     label="Confirmé"   />
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
              <div key={d} className="p-2 text-center text-[10px] font-bold uppercase tracking-widest text-white/35 sm:p-3">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 overflow-x-auto">
            {days.map((day, idx) => {
              if (!day) return (
                <div key={`blank-${idx}`} className="min-h-[72px] border-b border-r border-white/[0.04] bg-black/10 sm:min-h-[86px]" />
              )
              const key   = dateKey(day)
              const state = availability[key] || 'available'
              const isToday = key === today

              return (
                <div
                  key={key}
                  className={dayStyle(key, state)}
                  onClick={() => setSelectedDay(key === selectedDay ? null : key)}
                >
                  <div className="p-2">
                    <div className={`flex items-center justify-between ${dayTextColor(state)}`}>
                      <span className={`text-sm font-bold ${isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-gold text-[#08111F] text-xs' : ''}`}>
                        {day.getDate()}
                      </span>
                    </div>
                    <div className={`mt-1.5 hidden text-[9px] font-bold uppercase tracking-wider opacity-70 sm:block ${dayTextColor(state)}`}>
                      {dayLabel(state)}
                    </div>
                  </div>
                  {/* Color dot indicator */}
                  <div className={`absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                    state === 'reserved' ? 'bg-red-400' : state === 'pending' ? 'bg-amber-400' : 'bg-emerald-400/40'
                  }`} />
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Day detail */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GlassCard className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      {new Date(`${selectedDay}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <button type="button" onClick={() => setSelectedDay(null)} className="rounded-lg p-1 text-white/40 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  {dayReservations.length === 0 ? (
                    <p className="text-sm text-emerald-300">✓ Jour libre — aucune réservation</p>
                  ) : (
                    <div className="space-y-3">
                      {dayReservations.map((r) => (
                        <ReservationCard key={r.id} r={r} />
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Month list */}
          <GlassCard className="p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-white/45">
              Réservations du mois ({monthReservations.length})
            </h3>
            <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
              {monthReservations.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/35">Aucune réservation ce mois.</p>
              ) : (
                monthReservations.map((r) => <ReservationCard key={r.id} r={r} />)
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function ReservationCard({ r }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{r.car_name}</p>
          <p className="mt-1 truncate text-xs text-white/45">
            {r.customer_name || 'Client'} · {r.ref || r.reference || '—'}
          </p>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <p className="mt-3 text-xs font-semibold text-[#C9A84C]">
        {r.start_date} → {r.end_date}
      </p>
      {r.customer_phone && (
        <p className="mt-1 text-xs text-white/30">{r.customer_phone}</p>
      )}
    </div>
  )
}
