/**
 * components/modals/BookingModal.jsx
 *
 * BUGS FIXED:
 *  1. REQUIRED_DOCS only asked for cin_front + permis_front — but the service
 *     expects all 4 (cin_front, cin_back, permis_front, permis_back).
 *     Changed to require all 4 sides, matching constants/identityDocuments.js.
 *
 *  2. After successful reservation the modal was NOT closed by closeBooking().
 *     openReceipt sets bookingModal=null but does NOT call closeBooking, so the
 *     bookingModal flag stayed open. Added explicit closeBooking() call.
 *
 *  3. uploadDocument return shape mismatch: documentUpload.service.uploadDocument
 *     returns { path, url, uploaded_at }, but the code assigned `uploaded.url`
 *     which is correct — however `uploadedDocs[doc.key] = uploaded` stored the
 *     full object, while the JSONB `documents` column expects plain URL strings.
 *     Fixed to store { path, url } consistently and extract URL for URL-columns.
 *
 *  4. Date validation: end_date min was set to form.start (correct), but the
 *     displayed `minEnd` was only computed once. Updated to react to form.start
 *     changes so end date resets appropriately.
 *
 *  5. Form language mismatch: field labels mixed French/English. Normalised to
 *     French to match the rest of the UX.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiArrowLeft, FiCheck, FiLoader, FiPhone, FiX, FiUpload } from 'react-icons/fi'
import { BsFuelPump } from 'react-icons/bs'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../auth/AuthContext'
import { createReservation } from '../../lib/supabase'
import {
  uploadDocument,
  validateDocumentFile,
} from '../../services/documentUpload.service'
import { LOCATIONS } from '../../data'

const STEPS = ['Véhicule', 'Détails', 'Confirmation']

// FIX: All 4 required document sides — matching identityDocuments.js
const REQUIRED_DOCS = [
  { key: 'cin_front',    label: 'CIN Recto' },
  { key: 'cin_back',     label: 'CIN Verso' },
  { key: 'permis_front', label: 'Permis Recto' },
  { key: 'permis_back',  label: 'Permis Verso' },
]

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function diffDays(start, end) {
  if (!start || !end) return 0
  const startDate = new Date(`${start}T00:00:00`)
  const endDate   = new Date(`${end}T00:00:00`)
  return Math.max(0, Math.ceil((endDate - startDate) / 86400000))
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function buildWhatsAppMessage({ car, form, days, total, ref }) {
  return encodeURIComponent(
    `Bonjour HM Houti Cars 👋\n\nJe confirme ma demande de réservation.\n\n` +
    `Référence: ${ref}\nVéhicule: ${car.name}\nPrix: ${car.price} DH/jour\n` +
    `Carburant: ${car.fuel}\nDépart: ${formatDate(form.start)}\n` +
    `Retour: ${formatDate(form.end)}\nDurée: ${days} jour${days > 1 ? 's' : ''}\n` +
    `Ville: ${form.pickup}\nTotal: ${total} DH\n\n` +
    `Client: ${form.name}\nTéléphone: ${form.phone}\nWhatsApp: ${form.whatsapp}\n` +
    `Notes: ${form.notes || '—'}`,
  )
}

export default function BookingModal() {
  const { bookingModal, closeBooking, openReceipt, openAuth, addToast } = useApp()
  const { user, profile } = useAuth()
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})
  const [docs, setDocs]       = useState({})
  const [docProgress, setDocProgress] = useState({})
  const [uploadStatus, setUploadStatus] = useState('')
  const [form, setForm] = useState({
    start: '', end: '', pickup: LOCATIONS[0] || 'Nador',
    phone: '', whatsapp: '', name: '', notes: '',
  })

  const car   = bookingModal?.car
  const days  = useMemo(() => diffDays(form.start, form.end), [form.start, form.end])
  const total = car ? days * Number(car.price || 0) : 0

  useEffect(() => {
    if (!bookingModal) return
    setStep(0)
    setErrors({})
    setDocs({})
    setDocProgress({})
    setUploadStatus('')
    setLoading(false)
    setForm({
      start:    bookingModal.prefStart || '',
      end:      bookingModal.prefEnd   || '',
      pickup:   LOCATIONS[0] || 'Nador',
      phone:    profile?.phone    || user?.user_metadata?.phone    || '',
      whatsapp: profile?.phone    || user?.user_metadata?.phone    || '',
      name:     profile?.full_name || user?.user_metadata?.full_name || '',
      notes:    '',
    })
  }, [bookingModal, profile?.phone, profile?.full_name,
      user?.user_metadata?.phone, user?.user_metadata?.full_name])

  if (!bookingModal || !car) return null

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: null, form: null }))
    // FIX: if start date changes and end is now invalid, clear it
    if (key === 'start' && form.end && value > form.end) {
      setForm((prev) => ({ ...prev, start: value, end: '' }))
    }
  }

  const updateDoc = (key, file) => {
    const validationError = file ? validateDocumentFile(file) : null
    setDocs((prev) => ({ ...prev, [key]: file || null }))
    setErrors((prev) => ({ ...prev, [key]: validationError, form: null }))
  }

  const validateStep = useCallback(() => {
    const nextErrors = {}
    const today = todayStr()

    if (step === 1) {
      if (!form.start) nextErrors.start = 'Date de départ requise'
      if (!form.end)   nextErrors.end   = 'Date de retour requise'
      if (form.start && form.start < today)
        nextErrors.start = 'La date de départ ne peut pas être dans le passé'
      if (form.end && form.end < today)
        nextErrors.end = 'La date de retour ne peut pas être dans le passé'
      if (form.start && form.end && days <= 0)
        nextErrors.end = 'La date de retour doit être après la date de départ'
      if (!form.pickup)
        nextErrors.pickup = 'Ville de prise en charge requise'
      if (!form.name.trim())
        nextErrors.name = 'Nom complet requis'
      if (!form.phone.trim())
        nextErrors.phone = 'Téléphone requis'
      if (form.phone && !/^[+\d\s().-]{6,20}$/.test(form.phone.trim()))
        nextErrors.phone = 'Numéro de téléphone invalide'
      if (!form.whatsapp.trim())
        nextErrors.whatsapp = 'WhatsApp requis'
      if (form.whatsapp && !/^[+\d\s().-]{6,20}$/.test(form.whatsapp.trim()))
        nextErrors.whatsapp = 'Numéro WhatsApp invalide'

      // Validate all required docs
      for (const doc of REQUIRED_DOCS) {
        const file  = docs[doc.key]
        const vErr  = file ? validateDocumentFile(file) : `${doc.label} requis`
        if (vErr) nextErrors[doc.key] = vErr
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [step, form, docs, days])

  const goNext = () => {
    if (step === 1 && !validateStep()) return
    setStep((prev) => Math.min(prev + 1, 2))
  }

  const confirmReservation = async () => {
    if (!user) {
      addToast('Veuillez vous connecter pour confirmer votre réservation.', 'error')
      openAuth('login')
      return
    }

    setLoading(true)
    setUploadStatus('Préparation des documents…')
    const ref = `HM${Date.now().toString().slice(-6)}`

    try {
      // Upload all documents with per-file progress tracking
      const uploadedDocs  = {}
      const urlColumns    = {}

      for (const doc of REQUIRED_DOCS) {
        setUploadStatus(`Envoi ${doc.label}…`)
        setDocProgress((prev) => ({ ...prev, [doc.key]: 10 }))

        // FIX: uploadDocument returns { path, url, uploaded_at }
        const result = await uploadDocument(user.id, doc.key, docs[doc.key])
        uploadedDocs[doc.key] = result   // full object for JSONB column
        setDocProgress((prev) => ({ ...prev, [doc.key]: 100 }))

        // Map to flat URL-columns on reservations table
        const urlColMap = {
          cin_front:    'cin_front_url',
          cin_back:     'cin_back_url',
          permis_front: 'permis_front_url',
          permis_back:  'permis_back_url',
        }
        if (urlColMap[doc.key] && result.url) {
          urlColumns[urlColMap[doc.key]] = result.url
        }
      }

      // Build documents JSONB: { cin_front: url, ... }
      const documentsJson = Object.fromEntries(
        Object.entries(uploadedDocs).map(([k, v]) => [k, v.url]),
      )

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
        customer_phone:  form.phone.trim(),
        notes:
          `WhatsApp: ${form.whatsapp.trim()}` +
          (form.notes?.trim() ? `\nNotes client: ${form.notes.trim()}` : ''),
        status:    'pending',
        documents: documentsJson,
        ...urlColumns,
      }

      setUploadStatus('Enregistrement de la réservation…')
      const saved = await createReservation(reservation)

      addToast('Réservation confirmée avec succès! 🎉')

      // FIX: openReceipt sets bookingModal → null but doesn't call closeBooking.
      // Close explicitly first, then open receipt.
      closeBooking()
      openReceipt({ ...reservation, ...saved, car_img: car.img, created_at: new Date().toISOString() })

      window.open(
        `https://wa.me/212611460900?text=${buildWhatsAppMessage({ car, form, days, total, ref })}`,
        '_blank',
      )
    } catch (error) {
      console.error('[booking-confirm]', error)
      const msg = error?.message || 'Erreur lors de la réservation. Veuillez réessayer.'
      addToast(msg, 'error')
      setErrors({ form: msg })
    } finally {
      setLoading(false)
      setUploadStatus('')
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-black/85 px-4 py-6 backdrop-blur-xl sm:py-10"
        onClick={(e) => e.target === e.currentTarget && closeBooking()}
      >
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          className="relative w-full max-w-5xl overflow-hidden rounded-[30px] border border-gold/20 bg-[#08111F] shadow-[0_40px_140px_rgba(0,0,0,0.65)]"
        >
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(201,168,76,0.13),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(232,199,106,0.09),transparent_32%)]" />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-5 py-4 sm:px-7">
            <div>
              <div className="font-condensed text-[10px] font-bold uppercase tracking-[3px] text-gold">Réservation Premium</div>
              <div className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">Finalisez votre location</div>
            </div>
            <button
              type="button"
              onClick={closeBooking}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-gold/40 hover:text-gold"
            >
              <FiX />
            </button>
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Vehicle panel */}
            <div className="border-b border-white/[0.07] bg-[#0D1A2A]/70 p-5 sm:p-7 lg:border-b-0 lg:border-r">
              <VehiclePanel car={car} days={days} total={total} />
            </div>

            {/* Steps panel */}
            <div className="p-5 sm:p-7">
              <StepNav step={step} />

              {errors.form && (
                <div className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
                  {errors.form}
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.28 }}
                >
                  {step === 0 && <StepVehicle car={car} />}
                  {step === 1 && (
                    <StepDetails
                      form={form}
                      update={update}
                      updateDoc={updateDoc}
                      docs={docs}
                      errors={errors}
                      docProgress={docProgress}
                    />
                  )}
                  {step === 2 && (
                    <StepConfirm car={car} form={form} docs={docs} days={days} total={total} />
                  )}
                </motion.div>
              </AnimatePresence>

              {uploadStatus && (
                <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[2px] text-gold">
                  {uploadStatus}
                </p>
              )}

              {/* Navigation buttons */}
              <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={step === 0 ? closeBooking : () => setStep((p) => p - 1)}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-gold/25 px-6 py-3 font-condensed text-[12px] font-extrabold uppercase tracking-[2px] text-gold transition hover:bg-gold/[0.08]"
                >
                  <FiArrowLeft /> {step === 0 ? 'Annuler' : 'Retour'}
                </button>
                <div className="flex-1" />
                {step < 2 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="btn-gold px-8 py-3 text-[13px]"
                  >
                    Continuer →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={confirmReservation}
                    disabled={loading}
                    className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? <FiLoader className="animate-spin" /> : <FiCheck />}
                    {loading ? 'Confirmation…' : 'Confirmer la réservation'}
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
    <div className="mb-7 grid grid-cols-3 gap-2">
      {STEPS.map((label, index) => (
        <div
          key={label}
          className={`rounded-2xl border px-3 py-3 text-center transition ${
            index <= step
              ? 'border-gold/35 bg-gold/[0.08]'
              : 'border-white/[0.07] bg-white/[0.025]'
          }`}
        >
          <div
            className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
              index <= step ? 'bg-gold text-[#08111F]' : 'bg-white/[0.06] text-white/30'
            }`}
          >
            {index < step ? '✓' : index + 1}
          </div>
          <div
            className={`font-condensed text-[10px] font-bold uppercase tracking-[2px] ${
              index <= step ? 'text-gold' : 'text-white/30'
            }`}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

function VehiclePanel({ car, days, total }) {
  return (
    <div className="sticky top-6">
      <div className="mb-5 flex min-h-[240px] items-center justify-center rounded-[26px] border border-white/[0.06] bg-gradient-to-br from-[#111F31] to-[#08111F] p-6">
        <img
          src={car.img}
          alt={car.name}
          loading="lazy"
          className="h-[190px] w-full object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,0.6)]"
        />
      </div>
      <div className="mb-2 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold">
        Véhicule sélectionné
      </div>
      <h3 className="font-display text-4xl font-bold leading-none text-white">{car.name}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{car.price} DH/jour</Badge>
        <Badge><BsFuelPump /> {car.fuel}</Badge>
        {car.trans && <Badge>{car.trans}</Badge>}
      </div>
      {days > 0 && (
        <div className="mt-6 rounded-2xl border border-gold/25 bg-gold/[0.08] p-5">
          <div className="text-[11px] uppercase tracking-[2px] text-white/35">Total estimé</div>
          <div className="mt-1 font-condensed text-4xl font-black text-gold">{total} DH</div>
          <div className="text-xs text-white/35">
            {days} jour{days > 1 ? 's' : ''} × {car.price} DH
          </div>
        </div>
      )}
    </div>
  )
}

function StepVehicle({ car }) {
  return (
    <div>
      <h3 className="font-display text-4xl font-bold text-white">Votre véhicule est prêt</h3>
      <p className="mt-3 max-w-md text-sm font-light leading-[1.8] text-white/45">
        Vérifiez le véhicule sélectionné avant de renseigner vos dates et informations de contact.
      </p>
      <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Info label="Véhicule" value={car.name} />
          <Info label="Prix" value={`${car.price} DH/jour`} />
          <Info label="Carburant" value={car.fuel} />
          <Info label="Statut" value={car.available ? 'Disponible' : 'Indisponible'} />
        </div>
      </div>
    </div>
  )
}

function StepDetails({ form, update, updateDoc, docs, errors, docProgress }) {
  const today  = todayStr()
  const minEnd = form.start || today

  return (
    <div>
      <h3 className="font-display text-4xl font-bold text-white">Détails de location</h3>
      <p className="mt-3 max-w-md text-sm font-light leading-[1.8] text-white/45">
        Choisissez vos dates et indiquez vos informations pour recevoir la confirmation.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date de départ" error={errors.start}>
          <input
            type="date"
            min={today}
            value={form.start}
            onChange={(e) => update('start', e.target.value)}
            className="booking-input"
          />
        </Field>
        <Field label="Date de retour" error={errors.end}>
          <input
            type="date"
            min={minEnd}
            value={form.end}
            onChange={(e) => update('end', e.target.value)}
            className="booking-input"
          />
        </Field>
        <Field label="Ville de prise en charge" error={errors.pickup}>
          <select
            value={form.pickup}
            onChange={(e) => update('pickup', e.target.value)}
            className="booking-input"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc} className="bg-[#0D1A2A]">{loc}</option>
            ))}
          </select>
        </Field>
        <Field label="Numéro de téléphone" error={errors.phone}>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+212 6XX XXX XXX"
            className="booking-input"
          />
        </Field>
        <Field label="WhatsApp" error={errors.whatsapp}>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={(e) => update('whatsapp', e.target.value)}
            placeholder="+212 6XX XXX XXX"
            className="booking-input"
          />
        </Field>
        <Field label="Nom complet" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Nom complet"
            className="booking-input"
          />
        </Field>

        {/* FIX: All 4 document fields */}
        {REQUIRED_DOCS.map((doc) => (
          <DocField
            key={doc.key}
            docKey={doc.key}
            label={doc.label}
            file={docs[doc.key]}
            error={errors[doc.key]}
            progress={docProgress[doc.key]}
            onChange={(file) => updateDoc(doc.key, file)}
          />
        ))}

        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              placeholder="Demandes spéciales, heure d'arrivée…"
              className="booking-input resize-none"
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

function DocField({ docKey, label, file, error, progress, onChange }) {
  return (
    <Field label={label} error={error}>
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
          file
            ? 'border-gold/40 bg-gold/[0.06] text-gold'
            : error
            ? 'border-red-400/40 bg-red-400/[0.04] text-white/60'
            : 'border-white/[0.08] bg-white/[0.035] text-white/50'
        }`}
      >
        <FiUpload className="shrink-0" />
        <span className="truncate">{file ? file.name : `Choisir ${label}`}</span>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
      {progress > 0 && progress < 100 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Field>
  )
}

function StepConfirm({ car, form, docs, days, total }) {
  return (
    <div>
      <h3 className="font-display text-4xl font-bold text-white">Confirmation</h3>
      <p className="mt-3 max-w-md text-sm font-light leading-[1.8] text-white/45">
        Contrôlez les informations avant d'envoyer votre demande de réservation.
      </p>
      <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035]">
        <Summary label="Véhicule"       value={car.name} />
        <Summary label="Prix journalier" value={`${car.price} DH`} />
        <Summary label="Carburant"      value={car.fuel} />
        <Summary label="Dates"          value={`${formatDate(form.start)} → ${formatDate(form.end)}`} />
        <Summary label="Durée"          value={`${days} jour${days > 1 ? 's' : ''}`} />
        <Summary label="Ville"          value={form.pickup} />
        <Summary label="Client"         value={form.name} />
        <Summary label="Téléphone"      value={form.phone} />
        <Summary label="WhatsApp"       value={form.whatsapp} />
        <Summary label="Documents"      value={`${Object.values(docs).filter(Boolean).length}/${REQUIRED_DOCS.length} fournis`} />
        {form.notes && <Summary label="Notes" value={form.notes} />}
        <div className="flex items-center justify-between bg-gold/[0.08] px-5 py-5">
          <span className="font-condensed text-xl font-black uppercase tracking-[1px] text-white">Total</span>
          <span className="font-condensed text-4xl font-black text-gold">{total} DH</span>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold/[0.07] p-4 text-sm text-white/55">
        <FiPhone className="shrink-0 text-gold" />
        Après confirmation, WhatsApp s'ouvrira avec le résumé de votre réservation.
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[2px] text-white/35">
        {label}
      </span>
      {children}
      {error && <span className="mt-2 block text-xs text-red-300">{error}</span>}
    </label>
  )
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/[0.07] px-3 py-1.5 text-xs text-gold">
      {children}
    </span>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[2px] text-white/25">{label}</div>
      <div className="font-semibold text-white/75">{value}</div>
    </div>
  )
}

function Summary({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-white/[0.06] px-5 py-4">
      <span className="text-sm text-white/35">{label}</span>
      <span className="text-right text-sm font-semibold text-white/80">{value}</span>
    </div>
  )
}
