import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiArrowLeft, FiCheck, FiLoader, FiPhone, FiX } from 'react-icons/fi'
import { BsFuelPump } from 'react-icons/bs'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../auth/AuthContext'
import { createReservation } from '../../lib/supabase'
import { LOCATIONS } from '../../data'

const STEPS = ['Véhicule', 'Détails', 'Confirmation']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function diffDays(start, end) {
  if (!start || !end) return 0
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  return Math.max(0, Math.ceil((endDate - startDate) / 86400000))
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function buildWhatsAppMessage({ car, form, days, total, ref }) {
  return encodeURIComponent(
    `Bonjour HM Houti Cars 👋\n\nJe confirme ma demande de réservation.\n\nRéférence: ${ref}\nVéhicule: ${car.name}\nPrix: ${car.price} DH/jour\nCarburant: ${car.fuel}\nDépart: ${formatDate(form.start)}\nRetour: ${formatDate(form.end)}\nDurée: ${days} jour${days > 1 ? 's' : ''}\nVille: ${form.pickup}\nTotal: ${total} DH\n\nClient: ${form.name}\nTéléphone: ${form.phone}`,
  )
}

export default function BookingModal() {
  const { bookingModal, closeBooking, openReceipt, openAuth, addToast } = useApp()
  const { user, profile } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({ start: '', end: '', pickup: LOCATIONS[0] || 'Nador', phone: '', name: '' })

  const car = bookingModal?.car
  const days = useMemo(() => diffDays(form.start, form.end), [form.start, form.end])
  const total = car ? days * Number(car.price || 0) : 0

  useEffect(() => {
    if (!bookingModal) return
    setStep(0)
    setErrors({})
    setLoading(false)
    setForm({
      start: bookingModal.prefStart || '',
      end: bookingModal.prefEnd || '',
      pickup: LOCATIONS[0] || 'Nador',
      phone: profile?.phone || user?.user_metadata?.phone || '',
      name: profile?.full_name || user?.user_metadata?.full_name || '',
    })
  }, [bookingModal, profile?.phone, profile?.full_name, user?.user_metadata?.phone, user?.user_metadata?.full_name])

  if (!bookingModal || !car) return null

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: null, form: null }))
  }

  const validateStep = () => {
    const nextErrors = {}
    const today = todayStr()

    if (step === 1) {
      if (!form.start) nextErrors.start = 'Date de départ requise'
      if (!form.end) nextErrors.end = 'Date de retour requise'
      if (form.start && form.start < today) nextErrors.start = 'La date de départ ne peut pas être dans le passé'
      if (form.end && form.end < today) nextErrors.end = 'La date de retour ne peut pas être dans le passé'
      if (form.start && form.end && days <= 0) nextErrors.end = 'La date de retour doit être après la date de départ'
      if (!form.pickup) nextErrors.pickup = 'Ville de prise en charge requise'
      if (!form.name.trim()) nextErrors.name = 'Nom complet requis'
      if (!form.phone.trim()) nextErrors.phone = 'Téléphone requis'
      if (form.phone && !/^[+\d\s().-]{6,20}$/.test(form.phone.trim())) nextErrors.phone = 'Numéro de téléphone invalide'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const goNext = () => {
    if (step === 1 && !validateStep()) return
    setStep((prev) => Math.min(prev + 1, 2))
  }

  const confirmReservation = async () => {
    if (!validateStep()) return
    if (!user) {
      addToast('Veuillez vous connecter pour confirmer votre réservation.', 'error')
      openAuth('login')
      return
    }

    setLoading(true)
    const ref = `HM${Date.now().toString().slice(-6)}`

    try {
      const reservation = {
        user_id: user.id,
        ref,
        car_id: car.id,
        car_name: `${car.name}${car.year ? ` ${car.year}` : ''}`,
        car_price: car.price,
        pickup_location: form.pickup,
        return_location: form.pickup,
        start_date: form.start,
        end_date: form.end,
        days,
        total,
        payment_method: 'cash',
        customer_name: form.name.trim(),
        customer_email: user.email || profile?.email || null,
        customer_phone: form.phone.trim(),
        notes: 'Réservation rapide depuis le formulaire 3 étapes.',
        status: 'pending',
        documents: {},
      }

      const saved = await createReservation(reservation)
      addToast('Réservation confirmée avec succès! 🎉')
      openReceipt({ ...reservation, ...saved, car_img: car.img, created_at: new Date().toISOString() })
      window.open(`https://wa.me/212611460900?text=${buildWhatsAppMessage({ car, form, days, total, ref })}`, '_blank')
    } catch (error) {
      console.error('[booking-confirm]', error)
      const msg = error?.message || 'Erreur lors de la réservation. Veuillez réessayer.'
      addToast(msg, 'error')
      setErrors({ form: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-black/85 px-4 py-6 backdrop-blur-xl sm:py-10"
        onClick={(event) => event.target === event.currentTarget && closeBooking()}
      >
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          className="relative w-full max-w-5xl overflow-hidden rounded-[30px] border border-gold/20 bg-[#08111F] shadow-[0_40px_140px_rgba(0,0,0,0.65)]"
        >
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(201,168,76,0.13),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(232,199,106,0.09),transparent_32%)]" />
          <div className="relative flex items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-5 py-4 sm:px-7">
            <div>
              <div className="font-condensed text-[10px] font-bold uppercase tracking-[3px] text-gold">Réservation Premium</div>
              <div className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">Finalisez votre location</div>
            </div>
            <button type="button" onClick={closeBooking} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-gold/40 hover:text-gold">
              <FiX />
            </button>
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-white/[0.07] bg-[#0D1A2A]/70 p-5 sm:p-7 lg:border-b-0 lg:border-r">
              <VehiclePanel car={car} days={days} total={total} />
            </div>

            <div className="p-5 sm:p-7">
              <StepNav step={step} />
              {errors.form && <div className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{errors.form}</div>}

              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28 }}>
                  {step === 0 && <StepVehicle car={car} onNext={goNext} />}
                  {step === 1 && <StepDetails form={form} update={update} errors={errors} />}
                  {step === 2 && <StepConfirm car={car} form={form} days={days} total={total} />}
                </motion.div>
              </AnimatePresence>

              <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center">
                <button type="button" onClick={step === 0 ? closeBooking : () => setStep((prev) => prev - 1)} className="inline-flex items-center justify-center gap-2 rounded-sm border border-gold/25 px-6 py-3 font-condensed text-[12px] font-extrabold uppercase tracking-[2px] text-gold transition hover:bg-gold/[0.08]">
                  <FiArrowLeft /> {step === 0 ? 'Annuler' : 'Retour'}
                </button>
                <div className="flex-1" />
                {step < 2 ? (
                  <button type="button" onClick={goNext} className="btn-gold px-8 py-3 text-[13px]">Continuer →</button>
                ) : (
                  <button type="button" onClick={confirmReservation} disabled={loading} className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? <FiLoader className="animate-spin" /> : <FiCheck />} {loading ? 'Confirmation...' : 'Confirmer la réservation'}
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

function StepNav({ step }) {
  return (
    <div className="mb-7 grid grid-cols-3 gap-2">
      {STEPS.map((label, index) => (
        <div key={label} className={`rounded-2xl border px-3 py-3 text-center transition ${index <= step ? 'border-gold/35 bg-gold/[0.08]' : 'border-white/[0.07] bg-white/[0.025]'}`}>
          <div className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${index <= step ? 'bg-gold text-[#08111F]' : 'bg-white/[0.06] text-white/30'}`}>{index < step ? '✓' : index + 1}</div>
          <div className={`font-condensed text-[10px] font-bold uppercase tracking-[2px] ${index <= step ? 'text-gold' : 'text-white/30'}`}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function VehiclePanel({ car, days, total }) {
  return (
    <div className="sticky top-6">
      <div className="mb-5 flex min-h-[240px] items-center justify-center rounded-[26px] border border-white/[0.06] bg-gradient-to-br from-[#111F31] to-[#08111F] p-6">
        <img src={car.img} alt={car.name} loading="lazy" className="h-[190px] w-full object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,0.6)]" />
      </div>
      <div className="mb-2 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold">Véhicule sélectionné</div>
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
          <div className="text-xs text-white/35">{days} jour{days > 1 ? 's' : ''} × {car.price} DH</div>
        </div>
      )}
    </div>
  )
}

function StepVehicle({ car }) {
  return (
    <div>
      <h3 className="font-display text-4xl font-bold text-white">Votre véhicule est prêt</h3>
      <p className="mt-3 max-w-md text-sm font-light leading-[1.8] text-white/45">Vérifiez le véhicule sélectionné avant de renseigner vos dates et informations de contact.</p>
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

function StepDetails({ form, update, errors }) {
  const minEnd = form.start || todayStr()
  return (
    <div>
      <h3 className="font-display text-4xl font-bold text-white">Détails de location</h3>
      <p className="mt-3 max-w-md text-sm font-light leading-[1.8] text-white/45">Choisissez vos dates et indiquez vos informations pour recevoir la confirmation.</p>
      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Pickup date" error={errors.start}>
          <input type="date" min={todayStr()} value={form.start} onChange={(e) => update('start', e.target.value)} className="booking-input" />
        </Field>
        <Field label="Return date" error={errors.end}>
          <input type="date" min={minEnd} value={form.end} onChange={(e) => update('end', e.target.value)} className="booking-input" />
        </Field>
        <Field label="Pickup city" error={errors.pickup}>
          <select value={form.pickup} onChange={(e) => update('pickup', e.target.value)} className="booking-input">
            {LOCATIONS.map((location) => <option key={location} value={location} className="bg-[#0D1A2A]">{location}</option>)}
          </select>
        </Field>
        <Field label="Phone number" error={errors.phone}>
          <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+212 6XX XXX XXX" className="booking-input" />
        </Field>
        <Field label="Full name" error={errors.name}>
          <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nom complet" className="booking-input" />
        </Field>
      </div>
    </div>
  )
}

function StepConfirm({ car, form, days, total }) {
  return (
    <div>
      <h3 className="font-display text-4xl font-bold text-white">Confirmation</h3>
      <p className="mt-3 max-w-md text-sm font-light leading-[1.8] text-white/45">Contrôlez les informations avant d’envoyer votre demande de réservation.</p>
      <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035]">
        <Summary label="Véhicule" value={car.name} />
        <Summary label="Prix journalier" value={`${car.price} DH`} />
        <Summary label="Carburant" value={car.fuel} />
        <Summary label="Dates" value={`${formatDate(form.start)} → ${formatDate(form.end)}`} />
        <Summary label="Durée" value={`${days} jour${days > 1 ? 's' : ''}`} />
        <Summary label="Ville" value={form.pickup} />
        <Summary label="Client" value={form.name} />
        <Summary label="Téléphone" value={form.phone} />
        <div className="flex items-center justify-between bg-gold/[0.08] px-5 py-5">
          <span className="font-condensed text-xl font-black uppercase tracking-[1px] text-white">Total</span>
          <span className="font-condensed text-4xl font-black text-gold">{total} DH</span>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold/[0.07] p-4 text-sm text-white/55">
        <FiPhone className="shrink-0 text-gold" /> Après confirmation, WhatsApp s’ouvrira avec le résumé de votre réservation.
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[2px] text-white/35">{label}</span>
      {children}
      {error && <span className="mt-2 block text-xs text-red-300">{error}</span>}
    </label>
  )
}

function Badge({ children }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/[0.07] px-3 py-1.5 text-xs text-gold">{children}</span>
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
