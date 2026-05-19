import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPhone, FiUser, FiLogOut, FiGrid } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { useScrolled } from '../hooks/useScrolled'

const NAV_ITEMS = [
  { id: 'home',    label: 'Accueil'   },
  { id: 'cars',    label: 'Voitures'  },
  { id: 'why',     label: 'Pourquoi'  },
  { id: 'process', label: 'Comment'   },
  { id: 'reviews', label: 'Avis'      },
  { id: 'contact', label: 'Contact'   },
]

export default function Navbar() {
  const { activeSection, scrollTo, mobileOpen, setMobileOpen, openAuth, addToast } = useApp()
  const { user, profile, isAdmin, signOut } = useAuth()
  const scrolled = useScrolled(20)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      addToast('Déconnexion réussie.')
      navigate('/')
    } catch {
      addToast('Erreur lors de la déconnexion.', 'error')
    }
  }

  const handleNavClick = (id) => {
    navigate('/')
    setTimeout(() => scrollTo(id), 100)
  }

  return (
    <>
      {/* Promo banner */}
      <div
        className="py-2.5 px-4 sm:px-10 text-center text-xs"
        style={{
          background: 'linear-gradient(90deg, #0B1623, #14253A)',
          borderBottom: '1px solid rgba(201,168,76,0.2)',
          color: '#8A95A5',
        }}
      >
        <span>
          🎉 Offre spéciale!{' '}
          <span style={{ color: '#C9A84C', fontWeight: 700 }}>
            -10% sur toute location de 7 jours et plus.
          </span>{' '}
          <span className="hidden sm:inline">Contactez-nous sur WhatsApp!</span>
        </span>
      </div>

      {/* Main nav */}
      <nav
        className="flex items-center justify-between px-4 sm:px-10 h-[68px] transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(11,22,35,0.92)' : '#0B1623',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: `1px solid ${scrolled ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.07)'}`,
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none"
        >
          <div
            className="font-condensed font-black text-xl px-2.5 py-1 rounded-md tracking-wide"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C76A)', color: '#0B1623' }}
          >
            HM
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-white text-[17px] font-bold tracking-[0.5px]">Houti Cars</span>
            <span className="text-[9px] font-bold tracking-[2.5px] uppercase mt-0.5" style={{ color: '#C9A84C' }}>
              Location · Oujda-Nador
            </span>
          </div>
        </button>

        {/* Desktop nav links */}
        <ul className="hidden md:flex gap-7 list-none m-0 p-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id)}
                className="relative text-sm font-medium pb-0.5 transition-colors duration-200 cursor-pointer bg-transparent border-none"
                style={{ color: activeSection === item.id ? '#FFFFFF' : '#8A95A5' }}
              >
                {item.label}
                {activeSection === item.id && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-sm"
                    style={{ background: '#C9A84C' }}
                  />
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <a
            href="tel:+212611460900"
            className="hidden lg:flex items-center gap-1.5 text-[13px] font-medium no-underline transition-colors duration-200 hover:text-white"
            style={{ color: '#8A95A5' }}
          >
            <FiPhone style={{ color: '#C9A84C' }} />
            +212 611 460 900
          </a>

          {user ? (
            <div className="hidden md:flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-200 cursor-pointer bg-transparent border-none hover:text-white"
                  style={{ color: '#8A95A5' }}
                >
                  <FiGrid style={{ color: '#C9A84C' }} /> Admin
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 text-white font-semibold text-[13px] px-4 py-2 rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-white/[0.14]"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <FiUser style={{ color: '#C9A84C' }} />
                <span className="hidden sm:inline">
                  {profile?.full_name?.split(' ')[0] || 'Mon espace'}
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="transition-colors cursor-pointer bg-transparent border-none p-1 hover:text-white"
                style={{ color: '#8A95A5' }}
                title="Déconnexion"
              >
                <FiLogOut />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => openAuth('login')}
                className="text-[13px] font-medium transition-colors duration-200 cursor-pointer bg-transparent border-none hover:text-white"
                style={{ color: '#8A95A5' }}
              >
                Connexion
              </button>
              <button onClick={() => scrollTo('cars')} className="btn-gold text-[13px] px-5 py-2.5 whitespace-nowrap">
                Réserver
              </button>
            </div>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col gap-[5px] cursor-pointer p-1 bg-transparent border-none"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <span
              className="block w-6 h-0.5 bg-white rounded-sm transition-transform duration-300"
              style={{ transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : '' }}
            />
            <span
              className="block w-6 h-0.5 bg-white rounded-sm transition-opacity duration-300"
              style={{ opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block w-6 h-0.5 bg-white rounded-sm transition-transform duration-300"
              style={{ transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : '' }}
            />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[185]"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 bottom-0 right-0 w-[280px] z-[190] px-6 py-8 flex flex-col gap-4 overflow-y-auto"
              style={{ background: '#0B1623', borderLeft: '1px solid rgba(201,168,76,0.15)' }}
            >
              {/* Close button */}
              <button
                className="self-end mb-2 bg-transparent border-none cursor-pointer text-[#8A95A5] hover:text-white"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer"
              >
                ✕
              </button>

              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="text-base font-semibold py-3 text-left cursor-pointer bg-transparent border-none border-b transition-colors duration-200 hover:text-white"
                  style={{ color: '#8A95A5', borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  {item.label}
                </button>
              ))}

              {user ? (
                <>
                  <button
                    onClick={() => { navigate('/dashboard'); setMobileOpen(false) }}
                    className="flex items-center gap-2 font-semibold py-3 cursor-pointer bg-transparent border-none text-left"
                    style={{ color: '#C9A84C' }}
                  >
                    <FiUser /> Mon Espace
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { navigate('/admin'); setMobileOpen(false) }}
                      className="flex items-center gap-2 font-semibold py-3 cursor-pointer bg-transparent border-none text-left"
                      style={{ color: '#C9A84C' }}
                    >
                      <FiGrid /> Admin
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 font-semibold py-3 cursor-pointer bg-transparent border-none text-left text-red-400"
                  >
                    <FiLogOut /> Déconnexion
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { openAuth('login'); setMobileOpen(false) }}
                  className="flex items-center gap-2 font-semibold py-3 cursor-pointer bg-transparent border-none text-left"
                  style={{ color: '#C9A84C' }}
                >
                  <FiUser /> Connexion / Inscription
                </button>
              )}

              <a
                href="tel:+212611460900"
                className="flex items-center gap-2 font-semibold py-3 no-underline"
                style={{ color: '#C9A84C' }}
              >
                <FiPhone /> +212 611 460 900
              </a>
              <a
                href="https://wa.me/212611460900"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-semibold py-3 no-underline"
                style={{ color: '#25D366' }}
              >
                <FaWhatsapp /> WhatsApp
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
