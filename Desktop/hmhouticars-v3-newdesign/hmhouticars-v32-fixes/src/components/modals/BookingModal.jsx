/**
 * BookingModal.jsx — v3.2 FIXED (production-ready)
 *
 * BUGS FIXED vs v3.1:
 * 1. uploadedDocs stored full {path,url} object in JSONB 'documents' column
 *    → now sanitized to plain URL strings (string map) + separate URL columns
 * 2. isRangeBlocked used ALL statuses (including pending) to block new bookings
 *    → now only confirmed/completed dates block (via BLOCKING_STATUSES)
 * 3. closeBooking not called after openReceipt — booking modal state lingered
 *    → openReceipt already sets bookingModal=null in AppContext; no issue but
 *       added explicit guard to clear sessionStorage on success
 * 4. useCarAvailability fetched all statuses for blocking — now uses BLOCKING_STATUSES
 * 5. fileRefs typed as ref — survives re-renders, no state bloat
 */

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiArrowLeft, FiCheck, FiLoader, FiPhone, FiX,
  FiUpload, FiCalendar, FiUser, FiMapPin, FiAlertCircle, FiCheckCircle,
} from 'react-icons/fi'
import { BsFuelPump } from 'react-icons/bs'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../auth/AuthContext'
import { createReservation } from '../../lib/supabase'
import { uploadDocument, validateDocumentFile } from '../../services/documentUpload.service'
import { fetchCarReservations, enumerateDateRange, BLOCKING_STATUSES } from '../../services/availability.service'
import { LOCATIONS } from '../../data'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['Véhicule', 'Détails', 'Confirmation']

const REQUIRED_DOCS = [
  { key: 'cin_front',    label: 'CIN Recto',   hint: 'Face avant de votre CIN' },
  { key: 'cin_back',     label: 'CIN Verso',   hint: 'Face arrière de votre CIN' },
  { key: 'permis_front', label: 'Permis Recto', hint: 'Face avant du permis' },
  { key: 'permis_back',  label: 'Permis Verso', hint: 'Face arrière du permis' },
]

const PENDING_KEY = 'hmhouticars.pendingBooking.v2'
const AUTH_REQUIRED_MESSAGE = 'Veuillez créer un compte ou vous connecter pour continuer votre réservation.'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function diffDays(start, end) {
  if (!start || !end) return 0
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  return Math.max(0, Math.ceil((e - s) / 86_400_000))
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function buildWAMsg({ car, form, days, total, ref }) {
  const lines = [
    'Bonjour HM Houti Cars 👋',
    '',
    'Je confirme ma demande de réservation.',
    '',
    `Référence: ${ref}`,
    `Véhicule: ${car.name}${car.year ? ` ${car.year}` : ''}`,
    `Prix: ${car.price} DH/jour`,
    `Départ: ${formatDate(form.start)}`,
    `Retour: ${formatDate(form.end)}`,
    `Durée: ${days} jour${days > 1 ? 's' : ''}`,
    `Ville prise en charge: ${form.pickup}`,
    form.city ? `Ville client: ${form.city}` : null,
    form.deliveryAddress ? `Adresse livraison: ${form.deliveryAddress}` : null,
    `Total: ${total} DH`,
    '',
    `Client: ${form.name}`,
    `WhatsApp: ${form.whatsapp}`,
    form.notes ? `Notes: ${form.notes}` : null,
  ]
  return encodeURIComponent(lines.filter(Boolean).join('\n'))
}

function initialForm(profile, user, prefStart = '', prefEnd = '') {
  return {
    start:           prefStart || '',
    end:             prefEnd   || '',
    pickup:          LOCATIONS[0] || 'Oujda — Aéroport',
    city:            profile?.city || '',
    deliveryAddress: '',
    whatsapp:        profile?.phone || user?.user_metadata?.phone || '',
    name:            profile?.full_name || user?.user_metadata?.full_name || '',
    notes:           '',
  }
}

function saveForm(carId, form) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ carId, form, t: Date.now() })) } catch (_) {}
}
function loadForm(carId) {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p.carId !== carId) return null
    if (Date.now() - p.t > 30 * 60 * 1000) return null
    return p.form
  } catch (_) { return null }
}
function clearForm() { try { sessionStorage.removeItem(PENDING_KEY) } catch (_) {} }

// ─── Availability hook ────────────────────────────────────────────────────────
// FIX: Only fetch BLOCKING_STATUSES (confirmed + completed) for blocking logic
// ALL_ACTIVE_STATUSES used only for calendar display

function useCarAvailability(carId) {
  const [blockedDates,   setBlockedDates]   = useState(new Set()) // confirmed/completed only
  const [pendingDates,   setPendingDates]   = useState(new Set()) // pending only (info display)
  const [loading,        setLoading]        = useState(false)

  useEffect(() => {
    if (!carId) return
    let cancelled = false
    setLoading(true)

    Promise.all([
      // Blocking dates (confirmed + completed)
      fetchCarReservations(carId, { statuses: BLOCKING_STATUSES }),
      // Pending dates (display only)
      fetchCarReservations(carId, { statuses: ['pending'] }),
    ])
      .then(([blocked, pending]) => {
        if (cancelled) return
        const blockedSet = new Set()
        for (const row of blocked) {
          for (const d of enumerateDateRange(row.start_date, row.end_date)) blockedSet.add(d)
        }
        const pendingSet = new Set()
        for (const row of pending) {
          for (const d of enumerateDateRange(row.start_date, row.end_date)) pendingSet.add(d)
        }
        setBlockedDates(blockedSet)
        setPendingDates(pendingSet)
      })
      .catch(() => {
        if (!cancelled) { setBlockedDates(new Set()); setPendingDates(new Set()) }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [carId])

  // FIX: Range is blocked only if it overlaps with confirmed/completed dates
  const isRangeBlocked = useCallback((start, end) => {
    if (!start || !end) return false
    for (const d of enumerateDateRange(start, end)) {
      if (blockedDates.has(d)) return true
    }
    return false
  }, [blockedDates])

  // All displayed occupied dates (blocked + pending) for visual reference
  const bookedDates = useMemo(() => {
    const all = new Set([...blockedDates, ...pendingDates])
    return all
  }, [blockedDates, pendingDates])

  return { bookedDates, blockedDates, loading, isRangeBlocked }
}

// ─── BookingModal ─────────────────────────────────────────────────────────────

export default function BookingModal() {
  const { bookingModal, closeBooking, openReceipt, openAuth, addToast } = useApp()
  const { user, profile, authLoading } = useAuth()

  const [step,     setStep]     = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState('')
  const [errors,   setErrors]   = useState({})
  const [form,     setForm]     = useState(() => initialForm(null, null))
  const [docPrev,  setDocPrev]  = useState({})

  const fileRefs = useRef({})

  const car   = bookingModal?.car
  const days  = useMemo(() => diffDays(form.start, form.end), [form.start, form.end])
  const total = useMemo(() => (car ? days * Number(car.price || 0) : 0), [car, days])

  const { bookedDates, blockedDates, loading: availLoading, isRangeBlocked } = useCarAvailability(car?.id)

  // ── Init on open ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingModal) return
    if (authLoading) return

    if (!user) {
      openAuth('login', AUTH_REQUIRED_MESSAGE)
      addToast(AUTH_REQUIRED_MESSAGE, 'error')
      return
    }

    const carId   = bookingModal.car?.id
    const pending = carId ? loadForm(carId) : null
    const form    = pending ?? initialForm(profile, user, bookingModal.prefStart, bookingModal.prefEnd)

    setForm(form)
    setStep(0)
    setErrors({})
    setDocPrev({})
    setLoading(false)
    setProgress('')
    fileRefs.current = {}
    if (!pending) clearForm()
  }, [bookingModal, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-persist form ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (car?.id && bookingModal) saveForm(car.id, form)
  }, [form, car?.id, bookingModal])

  if (!bookingModal || !car) return null

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const update = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: null, form: null }))
  }

  const updateDoc = (key, file) => {
    if (!file) return
    const err = validateDocumentFile(file)
    if (err) { setErrors((p) => ({ ...p, [key]: err })); return }
    fileRefs.current[key] = file
    setDocPrev((p) => ({ ...p, [key]: file.name }))
    setErrors((p) => ({ ...p, [key]: null, form: null }))
  }

  // ── Validation ────────────────────────────────────────────────────────────────

  const validateStep1 = () => {
    const next  = {}
    const today = todayStr()

    if (!form.start)                                        next.start    = 'Date de départ requise'
    else if (form.start < today)                            next.start    = 'Date dans le passé'
    if (!form.end)                                          next.end      = 'Date de retour requise'
    else if (form.end < today)                              next.end      = 'Date dans le passé'
    else if (form.start && form.end && days <= 0)           next.end      = 'Le retour doit être après le départ'
    if (!form.pickup)                                       next.pickup   = 'Ville requise'
    if (!form.name.trim())                                  next.name     = 'Nom complet requis'
    if (!form.whatsapp.trim())                              next.whatsapp = 'WhatsApp requis'
    else if (!/^[+\d\s().-]{6,20}$/.test(form.whatsapp))   next.whatsapp = 'Numéro invalide'

    // FIX: block only on confirmed/completed dates
    if (form.start && form.end && isRangeBlocked(form.start, form.end)) {
      next.start = next.end = 'Ces dates sont déjà confirmées — choisissez d\'autres dates'
    }
    for (const doc of REQUIRED_DOCS) {
      if (!fileRefs.current[doc.key]) next[doc.key] = `${doc.label} requis`
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  const goNext = () => {
    if (!user) {
      saveForm(car.id, form)
      openAuth('login', AUTH_REQUIRED_MESSAGE)
      return
    }
    if (step === 1 && !validateStep1()) return
    setStep((p) => Math.min(p + 1, 2))
  }

  const goBack = () => { setErrors({}); setStep((p) => Math.max(p - 1, 0)) }

  // ── Submit ────────────────────────────────────────────────────────────────────

  const confirmReservation = async () => {
    if (!user) { openAuth('login', AUTH_REQUIRED_MESSAGE); return }
    if (!validateStep1()) { setStep(1); return }
    if (isRangeBlocked(form.start, form.end)) {
      addToast('Ces dates sont désormais confirmées.', 'error')
      setErrors({ form: 'Ces dates ne sont plus disponibles.' })
      setStep(1)
      return
    }

    setLoading(true)
    const ref = `HM${Date.now().toString().slice(-6)}`

    try {
      // FIX: Upload docs and build both {path,url} object map AND plain URL columns
      const urlColumns  = {}
      const uploadedDocs = {}

      for (const doc of REQUIRED_DOCS) {
        const file = fileRefs.current[doc.key]
        if (!file) throw new Error(`Document manquant : ${doc.label}`)
        setProgress(`Upload ${doc.label}...`)
        const result = await uploadDocument(user.id, doc.key, file)
        // result is { path, url, uploaded_at } from documentUpload.service
        uploadedDocs[doc.key] = result.url  // JSONB column: plain URL strings
        urlColumns[`${doc.key}_url`] = result.url  // dedicated URL columns
      }

      const notesParts = [
        `WhatsApp: ${form.whatsapp}`,
        form.city            ? `Ville client: ${form.city}`                  : null,
        form.deliveryAddress ? `Adresse livraison: ${form.deliveryAddress}`  : null,
        form.notes?.trim()   ? `Notes: ${form.notes}`                        : null,
      ].filter(Boolean)

      const reservation = {
        user_id:         user.id,
        ref,
        car_id:          car.id,
        car_name:        `${car.name}${car.year ? ` ${car.year}` : ''}`,
        car_price:       car.price,
        pickup_location: form.pickup,
        return_location: form.pickup,
        start_date:      form.start,
        end_date:        form.end,
        days,
        total,
        payment_method:  'cash',
        customer_name:   form.name.trim(),
        customer_email:  user.email || profile?.email || null,
        customer_phone:  form.whatsapp.trim(),
        notes:           notesParts.join('\n'),
        status:          'pending',
        documents:       uploadedDocs,  // plain URL string map for JSONB
        ...urlColumns,                  // individual URL columns
      }

      setProgress('Enregistrement de la réservation...')
      const saved = await createReservation(reservation)

      clearForm()
      addToast('Réservation envoyée avec succès ! 🎉')
      openReceipt({ ...reservation, ...saved, car_img: car.img, created_at: new Date().toISOString() })
      window.open(`https://wa.me/212611460900?text=${buildWAMsg({ car, form, days, total, ref })}`, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('[BookingModal]', err)
      const msg = err?.message?.includes('déjà confirmé')
        ? 'Ce véhicule est déjà confirmé sur ces dates. Choisissez d\'autres dates.'
        : (err?.message || 'Erreur lors de la réservation. Veuillez réessayer.')
      addToast(msg, 'error')
      setErrors({ form: msg })
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-black/85 px-3 py-4 backdrop-blur-xl sm:px-4 sm:py-8"
        onClick={(e) => e.target === e.currentTarget && closeBooking()}
      >
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
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

          {/* Body grid */}
          <div className="relative grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Left: vehicle panel */}
            <div className="border-b border-white/[0.07] bg-[#0D1A2A]/70 p-4 sm:p-7 lg:border-b-0 lg:border-r">
              <VehiclePanel
                car={car}
                days={days}
                total={total}
                bookedDates={bookedDates}
                blockedDates={blockedDates}
                availLoading={availLoading}
                formStart={form.start}
                formEnd={form.end}
                isRangeBlocked={isRangeBlocked}
              />
            </div>

            {/* Right: step content */}
            <div className="p-4 sm:p-7">
              <StepNav step={step} />

              {errors.form && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
                  <FiAlertCircle className="mt-0.5 shrink-0 text-red-400" />
                  <span>{errors.form}</span>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.25 }}>
                  {step === 0 && <StepVehicle car={car} availLoading={availLoading} />}
                  {step === 1 && <StepDetails form={form} update={update} updateDoc={updateDoc} docPrev={docPrev} errors={errors} bookedDates={bookedDates} blockedDates={blockedDates} availLoading={availLoading} />}
                  {step === 2 && <StepConfirm car={car} form={form} docPrev={docPrev} days={days} total={total} />}
                </motion.div>
              </AnimatePresence>

              {progress && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <FiLoader className="animate-spin text-gold" />
                  <p className="text-xs font-semibold uppercase tracking-[2px] text-gold">{progress}</p>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:mt-8 sm:flex-row sm:items-center">
                <button type="button" onClick={step === 0 ? closeBooking : goBack} className="inline-flex items-center justify-center gap-2 rounded-sm border border-gold/25 px-5 py-3 font-condensed text-[12px] font-extrabold uppercase tracking-[2px] text-gold transition hover:bg-gold/[0.08]">
                  <FiArrowLeft /> {step === 0 ? 'Annuler' : 'Retour'}
                </button>
                <div className="flex-1" />
                {step < 2 ? (
                  <button type="button" onClick={goNext} disabled={authLoading} className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60">
                    {authLoading ? <FiLoader className="animate-spin" /> : null}
                    Continuer →
                  </button>
                ) : (
                  <button type="button" onClick={confirmReservation} disabled={loading} className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60">
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
        <div key={label} className={`rounded-2xl border px-2 py-3 text-center transition ${i <= step ? 'border-gold/35 bg-gold/[0.08]' : 'border-white/[0.07] bg-white/[0.025]'}`}>
          <div className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${i <= step ? 'bg-gold text-[#08111F]' : 'bg-white/[0.06] text-white/30'}`}>
            {i < step ? '✓' : i + 1}
          </div>
          <div className={`font-condensed text-[10px] font-bold uppercase tracking-[2px] ${i <= step ? 'text-gold' : 'text-white/30'}`}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function VehiclePanel({ car, days, total, bookedDates, blockedDates, availLoading, formStart, formEnd, isRangeBlocked }) {
  const rangeBlocked = formStart && formEnd && isRangeBlocked(formStart, formEnd)
  // FIX: show warning (not blocking) when dates are pending but not confirmed
  const rangePending = formStart && formEnd && !rangeBlocked && (
    bookedDates.has(formStart) || bookedDates.has(formEnd)
  )

  return (
    <div className="sticky top-4">
      <div className="mb-5 flex min-h-[180px] items-center justify-center rounded-[22px] border border-white/[0.06] bg-gradient-to-br from-[#111F31] to-[#08111F] p-5 sm:min-h-[240px]">
        <img src={car.img} alt={car.name} loading="lazy" className="h-[150px] w-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] sm:h-[190px]" />
      </div>

      <div className="mb-2 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold">Véhicule sélectionné</div>
      <h3 className="font-display text-3xl font-bold leading-none text-white sm:text-4xl">{car.name}</h3>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{car.price} DH/jour</Badge>
        <Badge><BsFuelPump /> {car.fuel}</Badge>
        {car.trans && <Badge>{car.trans}</Badge>}
      </div>

      {days > 0 && (
        <div className={`mt-5 rounded-2xl border p-4 transition-all ${rangeBlocked ? 'border-red-400/30 bg-red-400/10' : rangePending ? 'border-amber-400/30 bg-amber-400/10' : 'border-gold/25 bg-gold/[0.08]'}`}>
          {rangeBlocked ? (
            <div className="flex items-center gap-2 text-sm text-red-300">
              <FiAlertCircle className="shrink-0" /> Ces dates sont déjà confirmées
            </div>
          ) : rangePending ? (
            <>
              <div className="mb-2 flex items-center gap-2 text-xs text-amber-300">
                <FiAlertCircle className="shrink-0" size={12} /> Des demandes existent sur ces dates — votre réservation reste possible
              </div>
              <div className="text-[11px] uppercase tracking-[2px] text-white/35">Total estimé</div>
              <div className="mt-1 font-condensed text-3xl font-black text-gold sm:text-4xl">{total} DH</div>
              <div className="text-xs text-white/35">{days} jour{days > 1 ? 's' : ''} × {car.price} DH</div>
            </>
          ) : (
            <>
              <div className="text-[11px] uppercase tracking-[2px] text-white/35">Total estimé</div>
              <div className="mt-1 font-condensed text-3xl font-black text-gold sm:text-4xl">{total} DH</div>
              <div className="text-xs text-white/35">{days} jour{days > 1 ? 's' : ''} × {car.price} DH</div>
            </>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/30">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" /> Dispo</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> En attente</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" /> Confirmé</span>
        {availLoading && <FiLoader className="ml-auto animate-spin text-gold/50" size={12} />}
      </div>
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
          <Info label="Statut"    value={car.available !== false ? 'Disponible' : 'Indisponible'} highlight={car.available !== false} />
        </div>
      </div>

      {availLoading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-white/35">
          <FiLoader className="animate-spin" size={14} /> Vérification disponibilité...
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-300">
          <FiCheckCircle className="shrink-0" /> Disponibilité vérifiée — sélectionnez vos dates à l'étape suivante.
        </div>
      )}
    </div>
  )
}

function StepDetails({ form, update, updateDoc, docPrev, errors, bookedDates, blockedDates, availLoading }) {
  const minEnd = form.start || todayStr()

  return (
    <div>
      <h3 className="font-display text-3xl font-bold text-white sm:text-4xl">Détails de location</h3>
      <p className="mt-2 max-w-md text-sm font-light leading-[1.8] text-white/45">Choisissez vos dates et renseignez vos informations.</p>

      <div className="mt-5 space-y-4">
        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date de départ" error={errors.start} icon={<FiCalendar />}>
            <input type="date" min={todayStr()} value={form.start} onChange={(e) => update('start', e.target.value)} style={{ colorScheme: 'dark' }} className={`booking-input ${errors.start ? 'border-red-400/50' : ''}`} />
            {form.start && blockedDates.has(form.start) && <span className="mt-1 block text-[11px] text-red-300">⛔ Date déjà confirmée</span>}
            {form.start && !blockedDates.has(form.start) && bookedDates.has(form.start) && <span className="mt-1 block text-[11px] text-amber-300">⚠️ Demandes en attente sur cette date</span>}
          </Field>
          <Field label="Date de retour" error={errors.end} icon={<FiCalendar />}>
            <input type="date" min={minEnd} value={form.end} onChange={(e) => update('end', e.target.value)} style={{ colorScheme: 'dark' }} className={`booking-input ${errors.end ? 'border-red-400/50' : ''}`} />
            {form.end && blockedDates.has(form.end) && <span className="mt-1 block text-[11px] text-red-300">⛔ Date déjà confirmée</span>}
            {form.end && !blockedDates.has(form.end) && bookedDates.has(form.end) && <span className="mt-1 block text-[11px] text-amber-300">⚠️ Demandes en attente sur cette date</span>}
          </Field>
        </div>
        {availLoading && <div className="flex items-center gap-2 text-xs text-white/35"><FiLoader className="animate-spin" size={12} /> Chargement disponibilité...</div>}

        {/* Location */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Ville prise en charge" error={errors.pickup} icon={<FiMapPin />}>
            <select value={form.pickup} onChange={(e) => update('pickup', e.target.value)} className="booking-input">
              {LOCATIONS.map((loc) => <option key={loc} value={loc} className="bg-[#0D1A2A]">{loc}</option>)}
            </select>
          </Field>
          <Field label="Ville du client (optionnel)" icon={<FiMapPin />}>
            <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Ex: Oujda, Nador..." className="booking-input" />
          </Field>
        </div>

        <Field label="Adresse de livraison (optionnel)" icon={<FiMapPin />}>
          <input type="text" value={form.deliveryAddress} onChange={(e) => update('deliveryAddress', e.target.value)} placeholder="Adresse précise pour livraison du véhicule" className="booking-input" />
        </Field>

        {/* Identity */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nom complet" error={errors.name} icon={<FiUser />}>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Prénom et nom" className="booking-input" />
          </Field>
          <Field label="WhatsApp" error={errors.whatsapp} icon={<FiPhone />}>
            <input type="tel" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="+212 6XX XXX XXX" className="booking-input" />
          </Field>
        </div>

        {/* Documents */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="mb-3 font-condensed text-[11px] font-bold uppercase tracking-[2px] text-gold">Documents requis</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REQUIRED_DOCS.map((doc) => (
              <DocUploadField key={doc.key} doc={doc} preview={docPrev[doc.key]} error={errors[doc.key]} onChange={(file) => updateDoc(doc.key, file)} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-white/25">Formats : JPG, PNG, PDF · Max 5 Mo · Stockage sécurisé</p>
        </div>

        <Field label="Notes (optionnel)">
          <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} placeholder="Demandes spéciales, heure d'arrivée préférée..." className="booking-input resize-none" />
        </Field>
      </div>
    </div>
  )
}

function DocUploadField({ doc, preview, error, onChange }) {
  const ref = useRef(null)
  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${preview ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : error ? 'border-red-400/30 bg-red-400/[0.06]' : 'border-white/10 bg-white/[0.03] hover:border-gold/30'}`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${preview ? 'bg-emerald-400/20 text-emerald-400' : 'bg-white/[0.06] text-white/40'}`}>
          {preview ? <FiCheck size={14} /> : <FiUpload size={14} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-condensed text-[11px] font-bold uppercase tracking-[1.5px] text-white/60">{doc.label}</div>
          <div className={`mt-0.5 truncate text-xs ${preview ? 'text-emerald-300' : 'text-white/25'}`}>{preview || doc.hint}</div>
        </div>
      </button>
      {error && <span className="mt-1 block text-[11px] text-red-300">{error}</span>}
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
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
        <Summary label="Dates"           value={`${formatDate(form.start)} → ${formatDate(form.end)}`} />
        <Summary label="Durée"           value={`${days} jour${days > 1 ? 's' : ''}`} />
        <Summary label="Prise en charge" value={form.pickup} />
        {form.city            && <Summary label="Ville client"      value={form.city} />}
        {form.deliveryAddress && <Summary label="Adresse livraison" value={form.deliveryAddress} />}
        <Summary label="Client"          value={form.name} />
        <Summary label="WhatsApp"        value={form.whatsapp} />
        {REQUIRED_DOCS.map((doc) => (
          <Summary key={doc.key} label={doc.label} value={
            docPrev[doc.key]
              ? <span className="flex items-center gap-1 text-emerald-300"><FiCheck size={12} /> {docPrev[doc.key]}</span>
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

// ─── Atoms ────────────────────────────────────────────────────────────────────

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
      <div className={`font-semibold ${highlight ? 'text-emerald-300' : 'text-white/75'}`}>{value}</div>
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
