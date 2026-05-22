/**
 * CreateReservationModal.jsx
 *
 * Enterprise-grade admin reservation creator.
 * Works EXACTLY like the website booking flow:
 *   - Same DB schema & field mapping
 *   - Same overlap conflict detection
 *   - Same status lifecycle
 *   - Same analytics visibility
 *   - Same notifications
 *
 * Additional admin capabilities:
 *   - Guest / anonymous customers (no account required)
 *   - Auto-fill from existing customer profiles
 *   - Manual price override
 *   - Source = 'admin' flag for analytics
 *   - Admin notes field
 *   - Conflict detection with live feedback
 *   - Status pre-selection (confirm immediately, etc.)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, User, Car, Calendar, MapPin, Phone, Mail, CreditCard,
  AlertTriangle, Check, Loader2, ChevronDown, Search, StickyNote,
  UserCheck, UserX, Hash, Clock
} from 'lucide-react'
import { useAdminData } from '../../context/AdminDataContext'
import { useAuth } from '../../auth/AuthContext'
import { createAdminReservation, getCarBookedDates } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Espèces' },
  { value: 'card',     label: 'Carte bancaire' },
  { value: 'transfer', label: 'Virement' },
  { value: 'cheque',   label: 'Chèque' },
]

const INITIAL_STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmée directement', color: 'text-blue-300' },
  { value: 'pending',   label: 'En attente validation', color: 'text-amber-300' },
]

const PICKUP_LOCATIONS = [
  'Agence principale', 'Aéroport Mohammed V', 'Gare Casablanca',
  'Aéroport Marrakech-Menara', 'Livraison à domicile'
]

function Field({ label, required, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/45">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-white/30">{hint}</p>}
      {error && <p className="text-[11px] text-red-400 flex items-center gap-1"><AlertTriangle size={10} />{error}</p>}
    </div>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-white/25
        focus:outline-none focus:border-[#C9A84C]/50 focus:bg-white/[0.09] transition-all ${className}`}
      {...props}
    />
  )
}

function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm
        focus:outline-none focus:border-[#C9A84C]/50 transition-all appearance-none ${className}`}
      style={{ backgroundImage: 'none' }}
      {...props}
    >
      {children}
    </select>
  )
}

export default function CreateReservationModal({ open, onClose, onCreated }) {
  const { cars, users, refresh, addReservationLocally } = useAdminData()
  const { profile: adminProfile, user: adminUser } = useAuth()
  const { addToast } = useApp()

  // ─── Form state ──────────────────────────────────────────────────────────
  const [step, setStep]   = useState(1) // 1=customer, 2=vehicle+dates, 3=details+confirm
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Customer fields
  const [customerType, setCustomerType] = useState('guest') // 'account' | 'guest'
  const [selectedUserId, setSelectedUserId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [guestName,  setGuestName]  = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  // Vehicle + dates
  const [carId,      setCarId]      = useState('')
  const [startDate,  setStartDate]  = useState('')
  const [endDate,    setEndDate]    = useState('')
  const [pickup,     setPickup]     = useState('Agence principale')
  const [returnLoc,  setReturnLoc]  = useState('Agence principale')

  // Details
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [initStatus,    setInitStatus]    = useState('confirmed')
  const [adminNotes,    setAdminNotes]    = useState('')
  const [priceOverride, setPriceOverride] = useState('')

  // Conflict detection
  const [bookedDates,    setBookedDates]    = useState([])
  const [conflictDates,  setConflictDates]  = useState([])
  const [loadingDates,   setLoadingDates]   = useState(false)

  // ─── Derived ─────────────────────────────────────────────────────────────
  const selectedCar = useMemo(() => cars.find((c) => String(c.id) === String(carId)), [cars, carId])
  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId), [users, selectedUserId])

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0
    const d1 = new Date(startDate), d2 = new Date(endDate)
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [startDate, endDate])

  const basePrice = selectedCar ? (selectedCar.price_per_day || selectedCar.price || 0) : 0
  const total = Number(priceOverride) > 0 ? Number(priceOverride) * days : basePrice * days

  const filteredUsers = useMemo(() => {
    const q = customerSearch.toLowerCase()
    return users.filter((u) => u.role !== 'admin' && (
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    )).slice(0, 8)
  }, [users, customerSearch])

  // ─── Load booked dates when car selected ─────────────────────────────────
  useEffect(() => {
    if (!carId) { setBookedDates([]); setConflictDates([]); return }
    setLoadingDates(true)
    getCarBookedDates(carId)
      .then(setBookedDates)
      .catch(() => setBookedDates([]))
      .finally(() => setLoadingDates(false))
  }, [carId])

  // ─── Detect conflicts when dates change ──────────────────────────────────
  useEffect(() => {
    if (!startDate || !endDate || !bookedDates.length) { setConflictDates([]); return }
    const d1 = new Date(startDate), d2 = new Date(endDate)
    const conflicts = bookedDates.filter((d) => {
      const dd = new Date(d)
      return dd >= d1 && dd <= d2
    })
    setConflictDates(conflicts)
  }, [startDate, endDate, bookedDates])

  // ─── Reset on close ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setStep(1); setErrors({})
      setCustomerType('guest'); setSelectedUserId(''); setCustomerSearch('')
      setGuestName(''); setGuestEmail(''); setGuestPhone('')
      setCarId(''); setStartDate(''); setEndDate('')
      setPickup('Agence principale'); setReturnLoc('Agence principale')
      setPaymentMethod('cash'); setInitStatus('confirmed')
      setAdminNotes(''); setPriceOverride('')
      setBookedDates([]); setConflictDates([])
    }
  }, [open])

  // ─── Validation ───────────────────────────────────────────────────────────
  const validateStep = useCallback((s) => {
    const errs = {}
    if (s === 1) {
      if (customerType === 'guest') {
        if (!guestName.trim()) errs.guestName = 'Nom requis'
      } else {
        if (!selectedUserId) errs.selectedUser = 'Sélectionnez un client'
      }
    }
    if (s === 2) {
      if (!carId) errs.car = 'Sélectionnez un véhicule'
      if (!startDate) errs.startDate = 'Date de début requise'
      if (!endDate) errs.endDate = 'Date de fin requise'
      if (startDate && endDate && endDate <= startDate) errs.endDate = 'La date de fin doit être après le début'
      if (days <= 0) errs.endDate = 'Durée invalide'
      if (conflictDates.length > 0) errs.conflict = 'Conflit de dates détecté'
    }
    return errs
  }, [customerType, guestName, selectedUserId, carId, startDate, endDate, days, conflictDates])

  const goNext = () => {
    const errs = validateStep(step)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setStep((s) => s + 1)
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const errs = { ...validateStep(1), ...validateStep(2) }
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      const ref = `ADM-${new Date().getFullYear()}-${Date.now().toString(36).slice(-5).toUpperCase()}`

      const customerName  = customerType === 'account'
        ? (selectedUser?.full_name || '')
        : guestName.trim()
      const customerEmail = customerType === 'account'
        ? (selectedUser?.email || '')
        : guestEmail.trim()
      const customerPhone = customerType === 'account'
        ? (selectedUser?.phone || '')
        : guestPhone.trim()
      const userId = customerType === 'account' ? selectedUserId : null

      const unitPrice = Number(priceOverride) > 0 ? Number(priceOverride) : basePrice

      const reservationPayload = {
        user_id:          userId,
        car_id:           Number(carId),
        car_name:         selectedCar?.name || '',
        car_price:        unitPrice,
        start_date:       startDate,
        end_date:         endDate,
        days,
        total:            total,
        payment_method:   paymentMethod,
        customer_name:    customerName,
        customer_email:   customerEmail,
        customer_phone:   customerPhone,
        pickup_location:  pickup,
        return_location:  returnLoc,
        status:           initStatus,
        notes:            adminNotes || null,
        admin_notes:      adminNotes || null,
        ref,
        source:           'admin',
        is_guest:         !userId,
      }

      const created = await createAdminReservation(reservationPayload, adminProfile?.id || adminUser?.id)

      // Optimistic update — identical to website insert
      addReservationLocally?.(created)
      refresh()

      addToast(`✓ Réservation ${ref} créée avec succès`, 'success')
      onCreated?.(created)
      onClose()
    } catch (err) {
      addToast(err?.message || 'Erreur création réservation', 'error')
    } finally {
      setSaving(false)
    }
  }, [
    validateStep, customerType, selectedUser, guestName, guestEmail, guestPhone,
    selectedUserId, carId, selectedCar, startDate, endDate, days, total,
    basePrice, priceOverride, paymentMethod, initStatus, adminNotes,
    pickup, returnLoc, adminProfile, addReservationLocally, refresh, addToast, onCreated, onClose
  ])

  if (!open) return null

  const today = new Date().toISOString().split('T')[0]

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[92vh] flex flex-col
              bg-[#0c1219] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#C9A84C]/10 to-transparent">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">Nouvelle réservation admin</h2>
                <p className="text-[11px] text-white/40 mt-0.5">Crée une réservation identique au flux site web</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Steps indicator */}
            <div className="px-6 pt-4 pb-2 flex items-center gap-2">
              {['Client', 'Véhicule & Dates', 'Confirmation'].map((label, i) => {
                const n = i + 1
                const done = step > n
                const active = step === n
                return (
                  <React.Fragment key={n}>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        done ? 'bg-[#C9A84C] text-[#0B1623]' :
                        active ? 'bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/50' :
                        'bg-white/5 text-white/25 border border-white/10'
                      }`}>
                        {done ? <Check size={12} /> : n}
                      </div>
                      <span className={`text-xs font-semibold hidden sm:block ${active ? 'text-white' : 'text-white/30'}`}>{label}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px transition-all ${done ? 'bg-[#C9A84C]/50' : 'bg-white/10'}`} />}
                  </React.Fragment>
                )
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Step 1: Customer ── */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="flex gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/8">
                    {[
                      { v: 'guest',   label: 'Client sans compte', icon: UserX },
                      { v: 'account', label: 'Client avec compte',  icon: UserCheck },
                    ].map(({ v, label, icon: Icon }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCustomerType(v)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                          customerType === v
                            ? 'bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30'
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        <Icon size={15} />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{v === 'guest' ? 'Invité' : 'Compte'}</span>
                      </button>
                    ))}
                  </div>

                  {customerType === 'guest' ? (
                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex gap-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>Un profil invité temporaire sera créé. Aucune authentification requise.</span>
                      </div>
                      <Field label="Nom complet" required error={errors.guestName}>
                        <Input
                          value={guestName} onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Mohamed El Alami" autoFocus
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Téléphone" error={errors.guestPhone}>
                          <Input
                            value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="+212 6XX XXXXXX" type="tel"
                          />
                        </Field>
                        <Field label="Email" error={errors.guestEmail}>
                          <Input
                            value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="client@email.com" type="email"
                          />
                        </Field>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Field label="Rechercher un client" error={errors.selectedUser}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                          <input
                            value={customerSearch}
                            onChange={(e) => { setCustomerSearch(e.target.value); setSelectedUserId('') }}
                            placeholder="Nom, email ou téléphone..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/50 transition-all"
                            autoFocus
                          />
                        </div>
                      </Field>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {filteredUsers.length === 0 && customerSearch && (
                          <p className="text-center text-white/30 text-sm py-4">Aucun client trouvé</p>
                        )}
                        {filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setSelectedUserId(u.id); setCustomerSearch(u.full_name || u.email) }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                              selectedUserId === u.id
                                ? 'bg-[#C9A84C]/15 border border-[#C9A84C]/30'
                                : 'bg-white/[0.04] border border-white/8 hover:border-white/20'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C]/30 to-blue-500/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {(u.full_name || u.email || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{u.full_name || 'Sans nom'}</p>
                              <p className="text-[11px] text-white/40 truncate">{u.email} {u.phone && `• ${u.phone}`}</p>
                            </div>
                            {selectedUserId === u.id && <Check size={14} className="text-[#C9A84C] shrink-0 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Step 2: Vehicle & Dates ── */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <Field label="Véhicule" required error={errors.car}>
                    <Select value={carId} onChange={(e) => setCarId(e.target.value)}>
                      <option value="">— Choisir un véhicule —</option>
                      {cars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.price_per_day || c.price} DH/j
                          {!c.available ? ' (Indisponible)' : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {selectedCar && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                      <Car size={18} className="text-[#C9A84C] shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-white">{selectedCar.name}</p>
                        <p className="text-[11px] text-white/40">{selectedCar.cat} · {selectedCar.fuel} · {selectedCar.trans}</p>
                      </div>
                      {loadingDates && <Loader2 size={14} className="animate-spin text-white/30 ml-auto" />}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date de début" required error={errors.startDate}>
                      <Input type="date" value={startDate} min={today}
                        onChange={(e) => setStartDate(e.target.value)} />
                    </Field>
                    <Field label="Date de fin" required error={errors.endDate}>
                      <Input type="date" value={endDate} min={startDate || today}
                        onChange={(e) => setEndDate(e.target.value)} />
                    </Field>
                  </div>

                  {conflictDates.length > 0 && (
                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Conflit de réservation détecté</p>
                        <p className="opacity-70">{conflictDates.length} date(s) déjà bloquées sur cette période.</p>
                      </div>
                    </div>
                  )}

                  {days > 0 && !conflictDates.length && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                      <Check size={16} />
                      <span className="font-semibold">{days} jour{days > 1 ? 's' : ''} disponible{days > 1 ? 's' : ''}</span>
                      <span className="ml-auto font-black text-[#C9A84C]">{total.toLocaleString()} DH</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Lieu de prise en charge">
                      <Select value={pickup} onChange={(e) => setPickup(e.target.value)}>
                        {PICKUP_LOCATIONS.map((loc) => (
                          <option key={loc}>{loc}</option>
                        ))}
                        <option value="custom">Autre...</option>
                      </Select>
                    </Field>
                    <Field label="Lieu de retour">
                      <Select value={returnLoc} onChange={(e) => setReturnLoc(e.target.value)}>
                        {PICKUP_LOCATIONS.map((loc) => (
                          <option key={loc}>{loc}</option>
                        ))}
                        <option value="custom">Autre...</option>
                      </Select>
                    </Field>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Details & Confirm ── */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  {/* Summary card */}
                  <div className="p-4 rounded-2xl bg-[#C9A84C]/8 border border-[#C9A84C]/20 space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#C9A84C]/70">Récapitulatif</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-white/40 text-[10px] uppercase">Client</p>
                        <p className="text-white font-semibold">
                          {customerType === 'account' ? selectedUser?.full_name : guestName}
                          {customerType === 'guest' && <span className="ml-1.5 text-[10px] text-amber-400 border border-amber-500/30 rounded px-1 py-0.5">Invité</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-[10px] uppercase">Véhicule</p>
                        <p className="text-white font-semibold">{selectedCar?.name}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-[10px] uppercase">Période</p>
                        <p className="text-white font-semibold">{startDate} → {endDate}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-[10px] uppercase">Total</p>
                        <p className="text-[#C9A84C] font-black text-base">{total.toLocaleString()} DH</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Méthode de paiement">
                      <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Statut initial">
                      <Select value={initStatus} onChange={(e) => setInitStatus(e.target.value)}>
                        {INITIAL_STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <Field label="Prix unitaire / jour (override)" hint="Laissez vide pour utiliser le tarif du véhicule">
                    <div className="relative">
                      <Input
                        type="number" value={priceOverride}
                        onChange={(e) => setPriceOverride(e.target.value)}
                        placeholder={`${basePrice} DH (tarif par défaut)`}
                        className="pr-12"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">DH</span>
                    </div>
                  </Field>

                  <Field label="Notes admin" hint="Visible uniquement par les admins">
                    <textarea
                      value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      placeholder="Instructions spéciales, accord de prix, etc."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-white/25
                        focus:outline-none focus:border-[#C9A84C]/50 transition-all resize-none"
                    />
                  </Field>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/8 text-xs text-white/40">
                    <Hash size={12} />
                    <span>Source : <strong className="text-white/60">admin</strong> · Créé par : <strong className="text-white/60">{adminProfile?.full_name || 'Admin'}</strong></span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => step > 1 ? setStep((s) => s - 1) : onClose()}
                className="px-5 py-2.5 rounded-xl border border-white/15 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                {step > 1 ? '← Retour' : 'Annuler'}
              </button>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-white/25 hidden sm:block">Étape {step} / 3</span>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="px-6 py-2.5 rounded-xl bg-[#C9A84C] text-[#0B1623] font-black text-sm hover:bg-[#E8C76A] transition-colors"
                  >
                    Suivant →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#C9A84C] text-[#0B1623] font-black text-sm hover:bg-[#E8C76A] transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {saving ? 'Création...' : 'Créer la réservation'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
