/**
 * BookingModal.jsx — v4.0 ULTRA PREMIUM
 * - Auto-prefill step 2 from user profile
 * - Realtime autosave to localStorage + Supabase
 * - Premium glassmorphism calendar (Apple/Tesla/Airbnb Luxe)
 * - Realtime availability sync via Supabase subscriptions
 * - Skeleton loaders, smooth transitions, luxury UX
 */

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiArrowLeft, FiCheck, FiLoader, FiPhone, FiX,
  FiUpload, FiUser, FiMapPin, FiAlertCircle, FiCheckCircle,
  FiChevronLeft, FiChevronRight, FiMail, FiSave,
} from 'react-icons/fi'
import { BsFuelPump } from 'react-icons/bs'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../auth/AuthContext'
import { createReservation, supabase } from '../../lib/supabase'
import { uploadDocument, validateDocumentFile } from '../../services/documentUpload.service'
import { fetchCarReservations, enumerateDateRange, BLOCKING_STATUSES } from '../../services/availability.service'
import { updateProfileData } from '../../services/profile.service'
import { LOCATIONS } from '../../data'
import { getCarDisplayImage } from '../../services/cars.service'
import { parseSupabaseError } from '../../utils/supabaseErrors'

const STEPS = ['Véhicule', 'Détails', 'Confirmation']

const REQUIRED_DOCS = [
  { key: 'cin_front',    label: 'CIN Recto',    hint: 'Face avant de votre CIN' },
  { key: 'cin_back',     label: 'CIN Verso',    hint: 'Face arrière de votre CIN' },
  { key: 'permis_front', label: 'Permis Recto', hint: 'Face avant du permis' },
  { key: 'permis_back',  label: 'Permis Verso', hint: 'Face arrière du permis' },
]

const PENDING_KEY  = 'hmhouticars.pendingBooking.v3'
const PREFILL_KEY  = 'hmhouticars.userPrefill.v1'
const AUTH_MSG = 'Connectez-vous ou créez un compte pour finaliser votre réservation.'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lu','Ma','Me','Je','Ve','Sa','Di']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0] }

function diffDays(s, e) {
  if (!s || !e) return 0
  return Math.max(0, Math.ceil((new Date(`${e}T00:00:00`) - new Date(`${s}T00:00:00`)) / 86400000))
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
}

function fmtShort(d) {
  if (!d) return '—'
  return new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })
}

function buildWA({ car, form, days, total, ref }) {
  const lines = [
    'Bonjour HM Houti Cars 👋','',
    'Je confirme ma demande de réservation.','',
    `Référence: ${ref}`,
    `Véhicule: ${car.name}${car.year ? ` ${car.year}` : ''}`,
    `Prix: ${car.price} DH/jour`,
    `Départ: ${fmtDate(form.start)}`,
    `Retour: ${fmtDate(form.end)}`,
    `Durée: ${days} jour${days > 1 ? 's' : ''}`,
    `Ville prise en charge: ${form.pickup}`,
    form.city            ? `Ville client: ${form.city}`                : null,
    form.deliveryAddress ? `Adresse livraison: ${form.deliveryAddress}`: null,
    `Total: ${total} DH`,'',
    `Client: ${form.name}`,
    form.email           ? `Email: ${form.email}`                      : null,
    `WhatsApp: ${form.whatsapp}`,
    form.notes           ? `Notes: ${form.notes}`                      : null,
  ]
  return encodeURIComponent(lines.filter(Boolean).join('\n'))
}

function loadPrefillCache() {
  try { const r = localStorage.getItem(PREFILL_KEY); return r ? JSON.parse(r) : null } catch { return null }
}
function savePrefillCache(f) {
  try { localStorage.setItem(PREFILL_KEY, JSON.stringify({ name:f.name, email:f.email, whatsapp:f.whatsapp, city:f.city, deliveryAddress:f.deliveryAddress })) } catch {}
}

function initForm(profile, user, prefStart='', prefEnd='') {
  const c = loadPrefillCache()
  return {
    start:           prefStart || '',
    end:             prefEnd   || '',
    pickup:          LOCATIONS[0] || 'Oujda — Aéroport',
    name:            c?.name            || profile?.full_name        || user?.user_metadata?.full_name || '',
    email:           c?.email           || profile?.email            || user?.email || '',
    whatsapp:        c?.whatsapp        || profile?.phone            || user?.user_metadata?.phone || '',
    city:            c?.city            || profile?.city             || '',
    deliveryAddress: c?.deliveryAddress || profile?.delivery_address || '',
    notes:           '',
  }
}

function saveSession(carId, form) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ carId, form, t: Date.now() })) } catch {}
  savePrefillCache(form)
}
function loadSession(carId) {
  try {
    const r = sessionStorage.getItem(PENDING_KEY)
    if (!r) return null
    const p = JSON.parse(r)
    if (p.carId !== carId || Date.now() - p.t > 1800000) return null
    return p.form
  } catch { return null }
}
function clearSession() { try { sessionStorage.removeItem(PENDING_KEY) } catch {} }

// ─── Premium Calendar ─────────────────────────────────────────────────────────

function PremiumCalendar({ blockedDates, pendingDates, selectedStart, selectedEnd, onSelectStart, onSelectEnd, availLoading }) {
  const today = todayStr()
  const [vm, setVm] = useState(() => {
    const d = selectedStart ? new Date(`${selectedStart}T00:00:00`) : new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [hover, setHover]         = useState(null)
  const [pickEnd, setPickEnd]     = useState(false)

  const { year, month } = vm
  const firstDay   = new Date(year, month, 1)
  const offset     = (firstDay.getDay() + 6) % 7
  const daysInMo   = new Date(year, month + 1, 0).getDate()

  const cells = useMemo(() => {
    const arr = Array(offset).fill(null)
    for (let d = 1; d <= daysInMo; d++) {
      const mm = String(month+1).padStart(2,'0'), dd = String(d).padStart(2,'0')
      arr.push(`${year}-${mm}-${dd}`)
    }
    return arr
  }, [year, month, offset, daysInMo])

  const prevMo = () => setVm(v => v.month === 0 ? {year:v.year-1,month:11} : {year:v.year,month:v.month-1})
  const nextMo = () => setVm(v => v.month === 11 ? {year:v.year+1,month:0} : {year:v.year,month:v.month+1})

  const click = (date) => {
    if (!date || date < today || blockedDates.has(date)) return
    if (!selectedStart || !pickEnd) {
      onSelectStart(date); onSelectEnd(''); setPickEnd(true)
    } else {
      if (date <= selectedStart) { onSelectStart(date); onSelectEnd('') }
      else { onSelectEnd(date); setPickEnd(false) }
    }
  }

  const inRange = (d) => {
    if (!d || !selectedStart) return false
    const end = selectedEnd || hover
    return end && d > selectedStart && d < end
  }

  const dayClass = (date) => {
    if (!date) return 'invisible'
    const past    = date < today
    const blocked = blockedDates.has(date)
    const pending = !blocked && pendingDates.has(date)
    const isStart = date === selectedStart
    const isEnd   = date === selectedEnd
    const range   = inRange(date)
    const isHov   = date === hover && !selectedEnd && selectedStart && date > selectedStart

    let base = 'relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-[13px] font-medium transition-all duration-150 select-none '

    if (past)    return base + 'text-white/10 cursor-default'
    if (blocked) return base + 'bg-red-500/10 text-red-500/50 cursor-not-allowed line-through'
    if (isStart || isEnd) return base + 'bg-gradient-to-br from-[#C9A84C] to-[#E8C76A] text-[#08111F] font-bold shadow-[0_0_20px_rgba(201,168,76,0.6)] scale-110 z-10 cursor-pointer'
    if (pending && range) return base + 'bg-amber-400/20 text-amber-200 rounded-none cursor-pointer'
    if (pending) return base + 'text-amber-300 ring-1 ring-amber-400/30 hover:bg-amber-400/20 cursor-pointer'
    if (range)   return base + 'bg-gold/[0.15] text-white/90 rounded-none cursor-pointer'
    if (isHov)   return base + 'bg-gold/[0.12] text-gold cursor-pointer'
    return base + 'text-white/75 hover:bg-white/[0.07] hover:text-gold hover:scale-105 cursor-pointer'
  }

  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i+7))

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/[0.08]"
      style={{
        background:'linear-gradient(135deg,rgba(13,26,42,0.97) 0%,rgba(8,17,31,0.99) 100%)',
        backdropFilter:'blur(24px)',
        boxShadow:'0 24px 64px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.055)',
      }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[20px]"
        style={{background:'radial-gradient(circle at 20% 0%,rgba(201,168,76,0.08) 0%,transparent 55%)'}} />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 py-4">
        <button type="button" onClick={prevMo}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:border-gold/40 hover:text-gold hover:bg-gold/[0.06]">
          <FiChevronLeft size={14} />
        </button>
        <div className="text-center">
          <div className="font-condensed text-[13px] font-bold uppercase tracking-[3px] text-gold">{MONTHS_FR[month]}</div>
          <div className="text-[10px] text-white/25 font-medium">{year}</div>
        </div>
        <button type="button" onClick={nextMo}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40 transition hover:border-gold/40 hover:text-gold hover:bg-gold/[0.06]">
          <FiChevronRight size={14} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center font-condensed text-[10px] font-bold uppercase tracking-[1px] text-white/18 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="px-3 pb-3">
        {availLoading ? (
          <div className="space-y-1">
            {[0,1,2,3,4,5].map(r => (
              <div key={r} className="grid grid-cols-7 gap-0.5">
                {[0,1,2,3,4,5,6].map(c => (
                  <div key={c} className="mx-auto h-9 w-9 sm:h-10 sm:w-10 animate-pulse rounded-full bg-white/[0.04]" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7">
              {row.map((date, ci) => {
                const rangeCell = inRange(date)
                return (
                  <div key={ci}
                    className="flex items-center justify-center py-0.5"
                    style={{
                      background: rangeCell ? 'rgba(201,168,76,0.055)' : 'transparent',
                      borderRadius: date === selectedStart ? '50% 0 0 50%'
                                  : date === selectedEnd   ? '0 50% 50% 0'
                                  : undefined,
                    }}
                  >
                    <div
                      className={dayClass(date)}
                      onClick={() => click(date)}
                      onMouseEnter={() => date && setHover(date)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {date ? new Date(`${date}T00:00:00`).getDate() : ''}
                      {date === today && date !== selectedStart && date !== selectedEnd && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-gold/60" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Selection badge */}
      {(selectedStart || selectedEnd) && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-gold/20 bg-gold/[0.05] px-4 py-2.5">
          <div className="flex-1 text-center">
            <div className="font-condensed text-[9px] uppercase tracking-[2px] text-white/25">Départ</div>
            <div className="mt-0.5 font-condensed text-sm font-bold text-gold">{selectedStart ? fmtShort(selectedStart) : '—'}</div>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <div className="flex-1 text-center">
            <div className="font-condensed text-[9px] uppercase tracking-[2px] text-white/25">Retour</div>
            <div className="mt-0.5 font-condensed text-sm font-bold text-gold">{selectedEnd ? fmtShort(selectedEnd) : '—'}</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.04] px-4 py-3">
        <LegendDot color="bg-emerald-400"  label="Disponible" />
        <LegendDot color="bg-amber-400"    label="En attente" ring="ring-1 ring-amber-400/30" />
        <LegendDot color="bg-red-500"      label="Confirmé" />
        {availLoading && <FiLoader className="ml-auto animate-spin text-gold/40" size={11} />}
      </div>
    </div>
  )
}

function LegendDot({ color, label, ring='' }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${color} ${ring}`} />
      <span className="font-condensed text-[10px] uppercase tracking-[1px] text-white/25">{label}</span>
    </span>
  )
}

// ─── Availability hook w/ realtime ────────────────────────────────────────────

function useCarAvailability(carId) {
  const [blockedDates, setBlocked] = useState(new Set())
  const [pendingDates, setPending] = useState(new Set())
  const [loading,      setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!carId) return
    setLoading(true)
    try {
      const [blocked, pending] = await Promise.all([
        fetchCarReservations(carId, { statuses: BLOCKING_STATUSES }),
        fetchCarReservations(carId, { statuses: ['pending'] }),
      ])
      const bSet = new Set(), pSet = new Set()
      for (const r of blocked) for (const d of enumerateDateRange(r.start_date, r.end_date)) bSet.add(d)
      for (const r of pending) for (const d of enumerateDateRange(r.start_date, r.end_date)) pSet.add(d)
      setBlocked(bSet); setPending(pSet)
    } catch { setBlocked(new Set()); setPending(new Set()) }
    finally { setLoading(false) }
  }, [carId])

  useEffect(() => {
    if (!carId) return
    refresh()
    const ch = supabase
      .channel(`avail-${carId}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'reservations', filter:`car_id=eq.${carId}` }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [carId, refresh])

  const isRangeBlocked = useCallback((s, e) => {
    if (!s || !e) return false
    for (const d of enumerateDateRange(s, e)) if (blockedDates.has(d)) return true
    return false
  }, [blockedDates])

  const bookedDates = useMemo(() => new Set([...blockedDates, ...pendingDates]), [blockedDates, pendingDates])

  return { bookedDates, blockedDates, pendingDates, loading, isRangeBlocked }
}

// ─── Autosave hook ────────────────────────────────────────────────────────────

function useAutoSave(userId, form, delay=1400) {
  const timer = useRef(null)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!userId || !form.name) return
    savePrefillCache(form)
    clearTimeout(timer.current)
    setStatus(null)
    timer.current = setTimeout(async () => {
      setStatus('saving')
      try {
        await updateProfileData(userId, {
          full_name: form.name, phone: form.whatsapp,
          email: form.email, city: form.city,
          delivery_address: form.deliveryAddress,
        })
        setStatus('saved')
        setTimeout(() => setStatus(null), 2200)
      } catch {
        setStatus('error')
        setTimeout(() => setStatus(null), 3000)
      }
    }, delay)
    return () => clearTimeout(timer.current)
  }, [userId, form.name, form.email, form.whatsapp, form.city, form.deliveryAddress])

  return status
}

// ─── BookingModal ─────────────────────────────────────────────────────────────

export default function BookingModal() {
  const { bookingModal, closeBooking, openReceipt, openAuth, addToast, savePendingBooking } = useApp()
  const { user, profile, authLoading } = useAuth()

  const [step,     setStep]     = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState('')
  const [errors,   setErrors]   = useState({})
  const [form,     setForm]     = useState(() => initForm(null, null))
  const [docPrev,  setDocPrev]  = useState({})
  const fileRefs = useRef({})
  const authPromptedRef = useRef(false)
  const confirmLockRef = useRef(false)

  const saveStatus = useAutoSave(user?.id, form)

  const car   = bookingModal?.car
  const days  = useMemo(() => diffDays(form.start, form.end), [form.start, form.end])
  const total = useMemo(() => (car ? days * Number(car.price || 0) : 0), [car, days])

  const { bookedDates, blockedDates, pendingDates, loading:availLoading, isRangeBlocked } = useCarAvailability(car?.id)

  // Init on open (authenticated users only — guests are prompted via openBooking)
  useEffect(() => {
    if (!bookingModal || authLoading) return
    const carId = bookingModal.car?.id
    const pending = carId ? loadSession(carId) : null
    setForm(pending ?? initForm(profile, user, bookingModal.prefStart, bookingModal.prefEnd))
    setStep(0); setErrors({}); setDocPrev({}); setLoading(false); setProgress('')
    fileRefs.current = {}
    authPromptedRef.current = false
    confirmLockRef.current = false
    if (!pending) clearSession()
  }, [bookingModal, authLoading, user?.id]) // eslint-disable-line

  // Sync profile into form if profile loads after modal open
  useEffect(() => {
    if (!profile || !bookingModal || !user) return
    setForm(prev => ({
      ...prev,
      name:            prev.name            || profile.full_name        || user?.user_metadata?.full_name || '',
      email:           prev.email           || profile.email            || user?.email || '',
      whatsapp:        prev.whatsapp        || profile.phone            || user?.user_metadata?.phone || '',
      city:            prev.city            || profile.city             || '',
      deliveryAddress: prev.deliveryAddress || profile.delivery_address || '',
    }))
  }, [profile]) // eslint-disable-line

  // Persist form on every change
  useEffect(() => {
    if (car?.id && bookingModal) saveSession(car.id, form)
  }, [form, car?.id, bookingModal])

  if (!bookingModal || !car) return null

  const update = (key, val) => { setForm(p => ({...p,[key]:val})); setErrors(p => ({...p,[key]:null,form:null})) }

  const updateDoc = (key, file) => {
    if (!file) return
    const err = validateDocumentFile(file)
    if (err) { setErrors(p => ({...p,[key]:err})); return }
    fileRefs.current[key] = file
    setDocPrev(p => ({...p,[key]:file.name}))
    setErrors(p => ({...p,[key]:null,form:null}))
  }

  const validateDatesAndContact = () => {
    const e = {}, today = todayStr()
    if (!form.start)                                      e.start    = 'Date de départ requise'
    else if (form.start < today)                          e.start    = 'Date dans le passé'
    if (!form.end)                                        e.end      = 'Date de retour requise'
    else if (form.end < today)                            e.end      = 'Date dans le passé'
    else if (form.start && form.end && days <= 0)         e.end      = 'Le retour doit être après le départ'
    if (!form.pickup)                                     e.pickup   = 'Ville requise'
    if (!form.name.trim())                                e.name     = 'Nom complet requis'
    if (!form.whatsapp.trim())                            e.whatsapp = 'WhatsApp requis'
    else if (!/^[+\d\s().-]{6,20}$/.test(form.whatsapp)) e.whatsapp = 'Numéro invalide'
    if (form.start && form.end && isRangeBlocked(form.start, form.end))
      e.start = e.end = "Ces dates sont déjà confirmées — choisissez d'autres dates"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const showStepErrors = () => {
    addToast('Veuillez compléter les champs obligatoires.', 'error')
  }

  const validate = () => {
    if (!validateDatesAndContact()) return false
    const docErrors = {}
    for (const doc of REQUIRED_DOCS) {
      if (!fileRefs.current[doc.key]) docErrors[doc.key] = `${doc.label} requis`
    }
    if (Object.keys(docErrors).length) {
      setErrors((p) => ({ ...p, ...docErrors }))
      return false
    }
    return true
  }

  const promptAuthForBooking = (preferSignup = true) => {
    if (authPromptedRef.current) return
    authPromptedRef.current = true
    saveSession(car.id, form)
    savePendingBooking?.(car, form.start, form.end)
    openAuth(preferSignup ? 'signup' : 'login', AUTH_MSG)
  }

  const goNext = () => {
    if (step === 0) {
      setErrors({})
      setStep(1)
      return
    }
    if (step === 1) {
      if (!user) {
        promptAuthForBooking(true)
        return
      }
      if (!validateDatesAndContact()) {
        showStepErrors()
        return
      }
      if (!validate()) {
        showStepErrors()
        return
      }
      setStep(2)
    }
  }
  const goBack = () => { setErrors({}); setStep(p => Math.max(p-1, 0)) }

  const confirm = async () => {
    if (loading || confirmLockRef.current) return
    if (!user) { promptAuthForBooking(true); return }
    if (!validate()) { setStep(1); return }
    if (isRangeBlocked(form.start, form.end)) {
      addToast('Ces dates sont désormais confirmées.','error')
      setErrors({form:'Ces dates ne sont plus disponibles.'}); setStep(1); return
    }
    confirmLockRef.current = true
    setLoading(true)
    const ref = `HM${Date.now().toString().slice(-6)}`
    try {
      const urlCols = {}, docs = {}
      for (const doc of REQUIRED_DOCS) {
        const file = fileRefs.current[doc.key]
        if (!file) throw new Error(`Document manquant : ${doc.label}`)
        setProgress(`Upload ${doc.label}...`)
        const r = await uploadDocument(user.id, doc.key, file)
        docs[doc.key] = r.url; urlCols[`${doc.key}_url`] = r.url
      }
      const notes = [
        `WhatsApp: ${form.whatsapp}`,
        form.email           ? `Email: ${form.email}`                     : null,
        form.city            ? `Ville client: ${form.city}`               : null,
        form.deliveryAddress ? `Adresse livraison: ${form.deliveryAddress}`: null,
        form.notes?.trim()   ? `Notes: ${form.notes}`                     : null,
      ].filter(Boolean).join('\n')

      const reservation = {
        user_id: user.id, ref, car_id: car.id,
        car_name: `${car.name}${car.year?` ${car.year}`:''}`, car_price: car.price,
        pickup_location: form.pickup, return_location: form.pickup,
        start_date: form.start, end_date: form.end, days, total,
        payment_method: 'cash',
        customer_name: form.name.trim(),
        customer_email: form.email || user.email || profile?.email || null,
        customer_phone: form.whatsapp.trim(),
        notes, status: 'pending', documents: docs, ...urlCols,
      }
      setProgress('Enregistrement...')
      const saved = await createReservation(reservation)
      clearSession()
      addToast('Réservation envoyée avec succès ! 🎉')
      openReceipt({...reservation,...saved,car_img:getCarDisplayImage(car),created_at:new Date().toISOString()})
      window.open(`https://wa.me/212611460900?text=${buildWA({car,form,days,total,ref})}`, '_blank', 'noopener,noreferrer')
    } catch (err) {
      const msg = err?.message?.includes('déjà confirmé')
        ? "Ce véhicule est déjà confirmé sur ces dates."
        : parseSupabaseError(err)
      addToast(msg,'error'); setErrors({form:msg})
    } finally {
      setLoading(false)
      setProgress('')
      confirmLockRef.current = false
    }
  }

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-black/85 px-3 py-4 backdrop-blur-xl sm:px-4 sm:py-8"
        onClick={e => e.target===e.currentTarget && closeBooking()}
      >
        <motion.div initial={{opacity:0,y:28,scale:0.97}} animate={{opacity:1,y:0,scale:1}}
          exit={{opacity:0,y:20,scale:0.97}}
          className="relative w-full max-w-5xl overflow-hidden rounded-[24px] border border-gold/20 bg-[#08111F] shadow-[0_40px_140px_rgba(0,0,0,0.65)] sm:rounded-[30px]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(201,168,76,0.13),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(232,199,106,0.09),transparent_32%)]" />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-4 py-4 sm:px-7">
            <div>
              <div className="font-condensed text-[10px] font-bold uppercase tracking-[3px] text-gold">Réservation Premium</div>
              <div className="mt-1 font-display text-xl font-bold text-white sm:text-3xl">Finalisez votre location</div>
            </div>
            <button type="button" onClick={closeBooking} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-gold/40 hover:text-gold">
              <FiX />
            </button>
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Left panel */}
            <div className="border-b border-white/[0.07] bg-[#0D1A2A]/70 p-4 sm:p-7 lg:border-b-0 lg:border-r">
              <VehiclePanel car={car} days={days} total={total}
                bookedDates={bookedDates} blockedDates={blockedDates}
                availLoading={availLoading} formStart={form.start} formEnd={form.end}
                isRangeBlocked={isRangeBlocked} />
            </div>

            {/* Right panel */}
            <div className="p-4 sm:p-7">
              <StepNav step={step} />

              {!user && (
                <div className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3">
                  <p className="text-xs leading-relaxed text-amber-100/90">{AUTH_MSG}</p>
                  <button
                    type="button"
                    onClick={() => promptAuthForBooking(true)}
                    className="mt-3 w-full rounded-lg border border-gold/30 bg-gold/10 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gold transition hover:bg-gold/20 sm:w-auto"
                  >
                    Se connecter / Créer un compte
                  </button>
                </div>
              )}

              {errors.form && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
                  <FiAlertCircle className="mt-0.5 shrink-0 text-red-400" />
                  <span>{errors.form}</span>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{opacity:0,x:18}} animate={{opacity:1,x:0}}
                  exit={{opacity:0,x:-18}} transition={{duration:0.25}}>
                  {step===0 && <StepVehicle car={car} availLoading={availLoading} />}
                  {step===1 && (
                    <StepDetails form={form} update={update} updateDoc={updateDoc}
                      docPrev={docPrev} errors={errors}
                      bookedDates={bookedDates} blockedDates={blockedDates} pendingDates={pendingDates}
                      availLoading={availLoading} saveStatus={saveStatus} />
                  )}
                  {step===2 && <StepConfirm car={car} form={form} docPrev={docPrev} days={days} total={total} />}
                </motion.div>
              </AnimatePresence>

              {progress && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <FiLoader className="animate-spin text-gold" />
                  <p className="text-xs font-semibold uppercase tracking-[2px] text-gold">{progress}</p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:mt-8 sm:flex-row sm:items-center">
                <button type="button" onClick={step===0 ? closeBooking : goBack}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-gold/25 px-5 py-3 font-condensed text-[12px] font-extrabold uppercase tracking-[2px] text-gold transition hover:bg-gold/[0.08]">
                  <FiArrowLeft /> {step===0 ? 'Annuler' : 'Retour'}
                </button>
                <div className="flex-1" />
                {step < 2 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={authLoading || (step === 1 && !user)}
                    className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {authLoading ? <FiLoader className="animate-spin" /> : null}
                    {step === 0 ? 'Continuer — étape 2' : 'Continuer — confirmation'}
                  </button>
                ) : (
                  <button type="button" onClick={confirm} disabled={loading}
                    className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? <FiLoader className="animate-spin" /> : <FiCheck />}
                    {loading ? 'Confirmation...' : 'Confirmer la réservation'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepNav({ step }) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className={`rounded-2xl border px-2 py-3 text-center transition ${i<=step?'border-gold/35 bg-gold/[0.08]':'border-white/[0.07] bg-white/[0.025]'}`}>
          <div className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${i<=step?'bg-gold text-[#08111F]':'bg-white/[0.06] text-white/30'}`}>
            {i<step?'✓':i+1}
          </div>
          <div className={`font-condensed text-[10px] font-bold uppercase tracking-[2px] ${i<=step?'text-gold':'text-white/30'}`}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function VehiclePanel({ car, days, total, bookedDates, blockedDates, availLoading, formStart, formEnd, isRangeBlocked }) {
  const rangeBlocked = formStart && formEnd && isRangeBlocked(formStart, formEnd)
  const rangePending = formStart && formEnd && !rangeBlocked && (bookedDates.has(formStart) || bookedDates.has(formEnd))
  return (
    <div className="sticky top-4">
      <div className="mb-5 flex min-h-[180px] items-center justify-center rounded-[22px] border border-white/[0.06] bg-gradient-to-br from-[#111F31] to-[#08111F] p-5 sm:min-h-[240px]">
        <img src={getCarDisplayImage(car)} alt={car.name} loading="lazy" className="h-[150px] w-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] sm:h-[190px]" />
      </div>
      <div className="mb-2 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold">Véhicule sélectionné</div>
      <h3 className="font-display text-3xl font-bold leading-none text-white sm:text-4xl">{car.name}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{car.price} DH/jour</Badge>
        <Badge><BsFuelPump /> {car.fuel}</Badge>
        {car.trans && <Badge>{car.trans}</Badge>}
      </div>
      {days > 0 && (
        <div className={`mt-5 rounded-2xl border p-4 transition-all ${rangeBlocked?'border-red-400/30 bg-red-400/10':rangePending?'border-amber-400/30 bg-amber-400/10':'border-gold/25 bg-gold/[0.08]'}`}>
          {rangeBlocked ? (
            <div className="flex items-center gap-2 text-sm text-red-300"><FiAlertCircle className="shrink-0" /> Ces dates sont déjà confirmées</div>
          ) : (
            <>
              {rangePending && <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-300"><FiAlertCircle size={11} /> Des demandes existent — votre réservation reste possible</div>}
              <div className="text-[11px] uppercase tracking-[2px] text-white/35">Total estimé</div>
              <div className="mt-1 font-condensed text-3xl font-black text-gold sm:text-4xl">{total} DH</div>
              <div className="text-xs text-white/35">{days} jour{days>1?'s':''} × {car.price} DH</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StepVehicle({ car, availLoading }) {
  return (
    <div>
      <h3 className="font-display text-3xl font-bold text-white sm:text-4xl">Votre véhicule est prêt</h3>
      <p className="mt-3 max-w-md text-sm font-light leading-[1.8] text-white/45">Vérifiez le véhicule sélectionné avant de renseigner vos dates et informations.</p>
      <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Info label="Véhicule"  value={car.name} />
          <Info label="Prix"      value={`${car.price} DH/jour`} />
          <Info label="Carburant" value={car.fuel} />
          <Info label="Statut"    value={car.available!==false?'Disponible':'Indisponible'} highlight={car.available!==false} />
        </div>
      </div>
      {availLoading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-white/35"><FiLoader className="animate-spin" size={14} /> Vérification disponibilité...</div>
      ) : (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-300">
          <FiCheckCircle className="shrink-0" /> Disponibilité vérifiée — renseignez vos dates à l&apos;étape suivante.
        </div>
      )}
    </div>
  )
}

function StepDetails({ form, update, updateDoc, docPrev, errors, bookedDates, blockedDates, pendingDates, availLoading, saveStatus }) {
  const isPrefilled = !!(form.name || form.email || form.whatsapp)
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">Détails de location</h3>
          <p className="mt-1 text-sm font-light leading-relaxed text-white/40">Sélectionnez vos dates et confirmez vos informations.</p>
        </div>
        <div className="shrink-0 mt-1 h-5">
          <AnimatePresence mode="wait">
            {saveStatus==='saving' && (
              <motion.div key="sv" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="flex items-center gap-1.5 text-[10px] text-white/30">
                <FiLoader className="animate-spin" size={10} />
                <span className="font-condensed uppercase tracking-[1px]">Sauvegarde...</span>
              </motion.div>
            )}
            {saveStatus==='saved' && (
              <motion.div key="sd" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                <FiSave size={10} />
                <span className="font-condensed uppercase tracking-[1px]">Sauvegardé</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isPrefilled && (
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
          className="mt-3 flex items-center gap-2.5 rounded-xl border border-gold/20 bg-gold/[0.05] px-4 py-2.5 text-sm">
          <FiCheckCircle className="shrink-0 text-gold" size={14} />
          <span className="text-white/55">
            Informations <span className="font-semibold text-gold">pré-remplies</span> depuis votre profil
          </span>
        </motion.div>
      )}

      <div className="mt-5 space-y-5">
        {/* Premium Calendar */}
        <div>
          <div className="mb-2 font-condensed text-[11px] font-bold uppercase tracking-[2px] text-white/35">
            <span className="mr-1 text-gold/60">✦</span>Sélection des dates
          </div>
          <PremiumCalendar
            blockedDates={blockedDates} pendingDates={pendingDates}
            selectedStart={form.start} selectedEnd={form.end}
            onSelectStart={d => update('start', d)} onSelectEnd={d => update('end', d)}
            availLoading={availLoading}
          />
          {(errors.start||errors.end) && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-300">
              <FiAlertCircle size={11} /> {errors.start||errors.end}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Ville prise en charge" error={errors.pickup} icon={<FiMapPin />}>
            <select value={form.pickup} onChange={e=>update('pickup',e.target.value)} className="booking-input">
              {LOCATIONS.map(loc=><option key={loc} value={loc} className="bg-[#0D1A2A]">{loc}</option>)}
            </select>
          </Field>
          <Field label="Ville du client (optionnel)" icon={<FiMapPin />}>
            <input type="text" value={form.city} onChange={e=>update('city',e.target.value)} placeholder="Ex: Oujda, Nador..." className="booking-input" />
          </Field>
        </div>

        <Field label="Adresse de livraison (optionnel)" icon={<FiMapPin />}>
          <input type="text" value={form.deliveryAddress} onChange={e=>update('deliveryAddress',e.target.value)} placeholder="Adresse précise pour la livraison" className="booking-input" />
        </Field>

        {/* Identity */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nom complet" error={errors.name} icon={<FiUser />}>
            <input type="text" value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Prénom et nom" className="booking-input" />
          </Field>
          <Field label="WhatsApp" error={errors.whatsapp} icon={<FiPhone />}>
            <input type="tel" value={form.whatsapp} onChange={e=>update('whatsapp',e.target.value)} placeholder="+212 6XX XXX XXX" className="booking-input" />
          </Field>
        </div>

        <Field label="Email" icon={<FiMail />}>
          <input type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="votre@email.com" className="booking-input" />
        </Field>

        {/* Documents */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-3 font-condensed text-[11px] font-bold uppercase tracking-[2px] text-gold">Documents requis</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REQUIRED_DOCS.map(doc=>(
              <DocUploadField key={doc.key} doc={doc} preview={docPrev[doc.key]} error={errors[doc.key]} onChange={file=>updateDoc(doc.key,file)} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-white/25">Formats : JPG, PNG, PDF · Max 5 Mo · Stockage sécurisé</p>
        </div>

        <Field label="Notes (optionnel)">
          <textarea value={form.notes} onChange={e=>update('notes',e.target.value)} rows={3} placeholder="Demandes spéciales, heure d'arrivée préférée..." className="booking-input resize-none" />
        </Field>
      </div>
    </div>
  )
}

function DocUploadField({ doc, preview, error, onChange }) {
  const ref = useRef(null)
  return (
    <div>
      <button type="button" onClick={()=>ref.current?.click()}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${preview?'border-emerald-400/30 bg-emerald-400/[0.06]':error?'border-red-400/30 bg-red-400/[0.06]':'border-white/10 bg-white/[0.03] hover:border-gold/30'}`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${preview?'bg-emerald-400/20 text-emerald-400':'bg-white/[0.06] text-white/40'}`}>
          {preview?<FiCheck size={14}/>:<FiUpload size={14}/>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-condensed text-[11px] font-bold uppercase tracking-[1.5px] text-white/60">{doc.label}</div>
          <div className={`mt-0.5 truncate text-xs ${preview?'text-emerald-300':'text-white/25'}`}>{preview||doc.hint}</div>
        </div>
      </button>
      {error && <span className="mt-1 block text-[11px] text-red-300">{error}</span>}
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={e=>onChange(e.target.files?.[0]||null)} />
    </div>
  )
}

function StepConfirm({ car, form, docPrev, days, total }) {
  return (
    <div>
      <h3 className="font-display text-3xl font-bold text-white sm:text-4xl">Confirmation</h3>
      <p className="mt-2 max-w-md text-sm font-light leading-[1.8] text-white/45">Vérifiez les informations avant d'envoyer votre demande.</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035]">
        <Summary label="Véhicule"        value={car.name} />
        <Summary label="Prix journalier" value={`${car.price} DH`} />
        <Summary label="Dates"           value={`${fmtDate(form.start)} → ${fmtDate(form.end)}`} />
        <Summary label="Durée"           value={`${days} jour${days>1?'s':''}`} />
        <Summary label="Prise en charge" value={form.pickup} />
        {form.city            && <Summary label="Ville client"      value={form.city} />}
        {form.deliveryAddress && <Summary label="Adresse livraison" value={form.deliveryAddress} />}
        <Summary label="Client"          value={form.name} />
        {form.email           && <Summary label="Email"             value={form.email} />}
        <Summary label="WhatsApp"        value={form.whatsapp} />
        {REQUIRED_DOCS.map(doc=>(
          <Summary key={doc.key} label={doc.label} value={
            docPrev[doc.key]
              ? <span className="flex items-center gap-1 text-emerald-300"><FiCheck size={12}/> {docPrev[doc.key]}</span>
              : <span className="text-red-300">Manquant</span>
          } />
        ))}
        {form.notes && <Summary label="Notes" value={form.notes} />}
        <div className="flex items-center justify-between bg-gold/[0.08] px-5 py-5">
          <span className="font-condensed text-xl font-black uppercase tracking-[1px] text-white">Total</span>
          <span className="font-condensed text-3xl font-black text-gold sm:text-4xl">{total} DH</span>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold/[0.07] p-4 text-sm text-white/55">
        <FiPhone className="shrink-0 text-gold" />
        Après confirmation, WhatsApp s'ouvrira avec le résumé de votre réservation.
      </div>
    </div>
  )
}

function Field({ label, error, icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 font-condensed text-[11px] font-bold uppercase tracking-[2px] text-white/35">
        {icon && <span className="text-gold/60">{icon}</span>}
        {label}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-[11px] text-red-300">{error}</span>}
    </label>
  )
}

function Badge({ children }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/[0.07] px-3 py-1.5 text-xs text-gold">{children}</span>
}

function Info({ label, value, highlight }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[2px] text-white/25">{label}</div>
      <div className={`font-semibold ${highlight?'text-emerald-300':'text-white/75'}`}>{value}</div>
    </div>
  )
}

function Summary({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-white/[0.06] px-5 py-3.5">
      <span className="text-sm text-white/35">{label}</span>
      <span className="text-right text-sm font-semibold text-white/80">{value}</span>
    </div>
  )
}
