/**
 * AppContext.jsx  — v3
 * UI-only context. Auth state lives in AuthContext.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authGetSession } from '../services/auth.service'

const AppContext = createContext(null)
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
  const [bookingModal, setBookingModal] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [authModal, setAuthModal] = useState(null)
  const [authNotice, setAuthNotice] = useState('')
  const [toasts, setToasts] = useState([])
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const scrollTo     = useCallback((id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false) }, [])
  const savePendingBooking = useCallback((car, prefStart = '', prefEnd = '') => {
    if (!car) return
    try {
      localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({ car, prefStart, prefEnd, savedAt: Date.now() }))
    } catch (_) {}
  }, [])
  const openBooking = useCallback(async (car, prefStart = '', prefEnd = '') => {
    let sessionUser = null
    try {
      const session = await authGetSession()
      sessionUser = session?.user ?? null
    } catch (_) {
      sessionUser = null
    }

    if (!sessionUser) {
      savePendingBooking(car, prefStart, prefEnd)
      setAuthNotice(BOOKING_AUTH_MESSAGE)
      setAuthModal('login')
      setToasts((p) => [...p, { id: uid(), msg: BOOKING_AUTH_MESSAGE, type: 'error' }])
      return
    }

    setBookingModal({ car, prefStart, prefEnd })
  }, [savePendingBooking])
  const resumePendingBooking = useCallback(() => {
    let pending = null
    try {
      const raw = localStorage.getItem(PENDING_BOOKING_KEY)
      if (raw) pending = JSON.parse(raw)
    } catch (_) {}

    localStorage.removeItem(PENDING_BOOKING_KEY)

    if (!pending?.car) return false
    if (pending.savedAt && Date.now() - pending.savedAt > PENDING_TTL) return false

    setBookingModal({ car: pending.car, prefStart: pending.prefStart || '', prefEnd: pending.prefEnd || '' })
    setAuthNotice('')
    setAuthModal(null)
    return true
  }, [])
  const closeBooking = useCallback(() => setBookingModal(null), [])
  const openReceipt  = useCallback((data) => { setBookingModal(null); setReceipt(data) }, [])
  const closeReceipt = useCallback(() => setReceipt(null), [])
  const openAuth     = useCallback((mode = 'login', notice = '') => { setAuthNotice(notice); setAuthModal(mode) }, [])
  const closeAuth    = useCallback(() => { setAuthModal(null); setAuthNotice('') }, [])
  const addToast = useCallback((msg, type = 'success') => {
    const id = uid()
    setToasts((p) => [...p, { id, msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500)
  }, [])
  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), [])

  return (
    <AppContext.Provider value={{
      activeSection, scrollTo,
      bookingModal, openBooking, closeBooking, resumePendingBooking,
      receipt, openReceipt, closeReceipt,
      authModal, authNotice, openAuth, closeAuth,
      toasts, addToast, removeToast,
      mobileOpen, setMobileOpen,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
