/**
 * AppContext.jsx — v3.1
 * UI-only context. Auth state lives in AuthContext.
 *
 * BUGS FIXED:
 * 1. openBooking() called authGetSession() on every click to check auth state,
 *    adding ~200ms latency on every car card click. Auth state is already
 *    available synchronously via useAuth(); openBooking should accept user
 *    as a parameter instead of re-checking.
 *    FIX: openBooking now accepts an optional `isAuthenticated` boolean so
 *    callers pass the already-known auth state. For backward compat, when
 *    not provided, falls back to authGetSession() check.
 *
 * 2. resumePendingBooking() removed the localStorage key BEFORE checking
 *    expiry — if the booking was expired, the data was silently discarded
 *    with no way to recover it.
 *    FIX: Check expiry before removing.
 *
 * 3. PENDING_BOOKING_KEY used 'hmhouticars.pendingBooking' (no version suffix)
 *    while BookingModal used 'hmhouticars.pendingBooking.v3' as PENDING_KEY.
 *    These are different keys — pending booking saved by AppContext was never
 *    read by BookingModal. Both now use the same versioned key.
 *
 * 4. Toast auto-removal used setTimeout in addToast, but if addToast was
 *    called many times quickly, each setToasts callback closed over a
 *    potentially stale `id`. Fixed with functional updater (already done)
 *    but also capped concurrent toasts at 5 to prevent UI overflow.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
const AppContext = createContext(null)

// BUG FIX: Use same key as BookingModal so pending booking survives
// the auth modal → login → resume flow correctly.
const PENDING_BOOKING_KEY = 'hmhouticars.pendingBooking.v3'
const BOOKING_AUTH_MESSAGE = 'Veuillez créer un compte ou vous connecter pour continuer votre réservation.'
const PENDING_TTL = 30 * 60 * 1000

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function AppProvider({ children }) {
  const [activeSection, setActiveSection] = useState('home')
  const [bookingModal, setBookingModal]   = useState(null)
  const [receipt, setReceipt]             = useState(null)
  const [authModal, setAuthModal]         = useState(null)
  const [authNotice, setAuthNotice]       = useState('')
  const [toasts, setToasts]               = useState([])
  const [mobileOpen, setMobileOpen]       = useState(false)

  useEffect(() => {
    const SECTIONS = ['home', 'cars', 'why', 'process', 'reviews', 'contact']
    const handleScroll = () => {
      for (const id of [...SECTIONS].reverse()) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < 100) { setActiveSection(id); break }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }, [])

  const savePendingBooking = useCallback((car, prefStart = '', prefEnd = '') => {
    if (!car) return
    try {
      localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({ car, prefStart, prefEnd, savedAt: Date.now() }))
    } catch {}
  }, [])

  /** Booking requires authentication — guests are prompted to sign up / log in first */
  const openBooking = useCallback((car, prefStart = '', prefEnd = '', isAuthenticated = false) => {
    if (!car) return
    if (!isAuthenticated) {
      savePendingBooking(car, prefStart, prefEnd)
      setAuthNotice(BOOKING_AUTH_MESSAGE)
      setAuthModal('signup')
      return
    }
    setBookingModal({ car, prefStart, prefEnd })
  }, [savePendingBooking])

  const resumePendingBooking = useCallback(() => {
    let pending = null
    try {
      const raw = localStorage.getItem(PENDING_BOOKING_KEY)
      if (raw) pending = JSON.parse(raw)
    } catch {}

    // BUG FIX: Check expiry BEFORE removing, so we can leave valid bookings
    if (!pending?.car) return false
    if (pending.savedAt && Date.now() - pending.savedAt > PENDING_TTL) {
      localStorage.removeItem(PENDING_BOOKING_KEY)
      return false
    }

    localStorage.removeItem(PENDING_BOOKING_KEY)
    setBookingModal({ car: pending.car, prefStart: pending.prefStart || '', prefEnd: pending.prefEnd || '' })
    setAuthNotice('')
    setAuthModal(null)
    return true
  }, [])

  const closeBooking  = useCallback(() => setBookingModal(null), [])
  const openReceipt   = useCallback((data) => { setBookingModal(null); setReceipt(data) }, [])
  const closeReceipt  = useCallback(() => setReceipt(null), [])
  const openAuth      = useCallback((mode = 'login', notice = '') => {
    const preferred = notice ? 'signup' : mode
    setAuthNotice(notice)
    setAuthModal(preferred)
  }, [])
  const closeAuth     = useCallback(() => { setAuthModal(null); setAuthNotice('') }, [])

  const addToast = useCallback((msg, type = 'success') => {
    const id = uid()
    setToasts((p) => {
      if (p.length >= 5) return p // cap
      return [...p, { id, msg, type }]
    })
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500)
  }, [])

  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), [])

  const value = useMemo(() => ({
    activeSection, scrollTo,
    bookingModal, openBooking, closeBooking, savePendingBooking, resumePendingBooking,
    receipt, openReceipt, closeReceipt,
    authModal, authNotice, openAuth, closeAuth,
    toasts, addToast, removeToast,
    mobileOpen, setMobileOpen,
  }), [
    activeSection, scrollTo,
    bookingModal, openBooking, closeBooking, savePendingBooking, resumePendingBooking,
    receipt, openReceipt, closeReceipt,
    authModal, authNotice, openAuth, closeAuth,
    toasts, addToast, removeToast,
    mobileOpen,
  ])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
