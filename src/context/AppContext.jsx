/**
 * AppContext.jsx  — v3
 * UI-only context. Auth state lives in AuthContext.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [activeSection, setActiveSection] = useState('home')
  const [bookingModal, setBookingModal] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [authModal, setAuthModal] = useState(null)
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
  const openBooking  = useCallback((car, prefStart = '', prefEnd = '') => setBookingModal({ car, prefStart, prefEnd }), [])
  const closeBooking = useCallback(() => setBookingModal(null), [])
  const openReceipt  = useCallback((data) => { setBookingModal(null); setReceipt(data) }, [])
  const closeReceipt = useCallback(() => setReceipt(null), [])
  const openAuth     = useCallback((mode = 'login') => setAuthModal(mode), [])
  const closeAuth    = useCallback(() => setAuthModal(null), [])
  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts((p) => [...p, { id, msg, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500)
  }, [])
  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), [])

  return (
    <AppContext.Provider value={{
      activeSection, scrollTo,
      bookingModal, openBooking, closeBooking,
      receipt, openReceipt, closeReceipt,
      authModal, openAuth, closeAuth,
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
