import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPhone, FiUser, FiLogOut, FiGrid, FiChevronRight } from 'react-icons/fi'
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

function getInitials(name) {
  if (!name) return 'M'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}

export default function Navbar() {
  const { activeSection, scrollTo, mobileOpen, setMobileOpen, openAuth, addToast } = useApp()
  const { user, profile, isAdmin, signOut } = useAuth()
  const scrolled = useScrolled(20)
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  const handleLogout = async () => {
    setUserMenuOpen(false)
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

  const displayName = profile?.full_name?.split(' ')[0] || 'Mon espace'
  const initials = getInitials(profile?.full_name)

  return (
    <>
      <div
        className="py-2.5 px-4 sm:px-10 text-center text-xs"
        style={{
          background: 'linear-gradient(90deg, #0B1623, #14253A)',
          borderBottom: '1px solid rgba(201,168,76,0.2)',
          color: '#8A95A5',
        }}
      >
        🎉 Offre spéciale!{' '}
        <span style={{ color: '#C9A84C', fontWeight: 700 }}>
          -10% sur toute location de 7 jours et plus.
        </span>{' '}
        <span className="hidden sm:inline">Contactez-nous sur WhatsApp!</span>
      </div>

      <nav
        className={`flex items-center justify-between px-4 sm:px-10 h-[68px] transition-all duration-400${scrolled ? ' nav-scrolled-glow' : ''}`}
        style={{
          background: scrolled
            ? 'rgba(8, 14, 24, 0.94)'
            : '#0B1623',
          backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
          borderBottom: `1px solid ${scrolled ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.06)'}`,
          transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
        }}
      >
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
                    style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C76A)' }}
                  />
                )}
              </button>
            </li>
          ))}
        </ul>

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

              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="mon-espace-btn"
                  onClick={() => navigate('/dashboard')}
                  aria-label="Mon espace"
                >
                  <span className="mon-espace-avatar">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-full h-full object-cover rounded-[8px]"
                      />
                    ) : (
                      initials
                    )}
                  </span>
                  <span className="hidden sm:inline" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1px' }}>
                    {displayName}
                  </span>
                  <FiChevronRight className="mon-espace-chevron" />
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="transition-all cursor-pointer bg-transparent border-none p-2 rounded-lg hover:bg-white/[0.07] hover:text-white"
                style={{ color: '#8A95A5' }}
                title="Déconnexion"
              >
                <FiLogOut size={15} />
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

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[185] backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 bottom-0 right-0 w-[288px] z-[190] px-6 py-8 flex flex-col gap-1 overflow-y-auto"
              style={{
                background: 'rgba(8,14,24,0.97)',
                borderLeft: '1px solid rgba(201,168,76,0.15)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <button
                className="self-end mb-4 bg-transparent border-none cursor-pointer w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: '#8A95A5', background: 'rgba(255,255,255,0.06)' }}
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer"
              >
                ✕
              </button>

              {user && (
                <div
                  className="flex items-center gap-3 mb-4 p-4 rounded-[14px]"
                  style={{
                    background: 'rgba(201,168,76,0.07)',
                    border: '1px solid rgba(201,168,76,0.2)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[13px] font-black font-condensed flex-shrink-0 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C76A)', color: '#080E18' }}
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold leading-tight">{profile?.full_name || 'Utilisateur'}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#C9A84C' }}>Compte actif</div>
                  </div>
                </div>
              )}

              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { handleNavClick(item.id); setMobileOpen(false) }}
                  className="text-base font-semibold py-3.5 px-2 text-left cursor-pointer bg-transparent border-none border-b transition-all duration-200 hover:text-white rounded-lg hover:bg-white/[0.04]"
                  style={{ color: '#8A95A5', borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  {item.label}
                </button>
              ))}

              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {user ? (
                  <>
                    <button
                      onClick={() => { navigate('/dashboard'); setMobileOpen(false) }}
                      className="w-full flex items-center gap-3 font-semibold py-3.5 px-2 cursor-pointer bg-transparent border-none text-left rounded-lg hover:bg-white/[0.04] transition-colors"
                      style={{ color: '#C9A84C' }}
                    >
                      <FiUser size={16} /> Mon Espace
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { navigate('/admin'); setMobileOpen(false) }}
                        className="w-full flex items-center gap-3 font-semibold py-3.5 px-2 cursor-pointer bg-transparent border-none text-left rounded-lg hover:bg-white/[0.04] transition-colors"
                        style={{ color: '#C9A84C' }}
                      >
                        <FiGrid size={16} /> Admin
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 font-semibold py-3.5 px-2 cursor-pointer bg-transparent border-none text-left text-red-400 rounded-lg hover:bg-red-500/[0.08] transition-colors"
                    >
                      <FiLogOut size={16} /> Déconnexion
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { openAuth('login'); setMobileOpen(false) }}
                    className="w-full flex items-center gap-3 font-semibold py-3.5 px-2 cursor-pointer bg-transparent border-none text-left rounded-lg hover:bg-white/[0.04] transition-colors"
                    style={{ color: '#C9A84C' }}
                  >
                    <FiUser size={16} /> Connexion / Inscription
                  </button>
                )}
              </div>

              <a
                href="tel:+212611460900"
                className="flex items-center gap-3 font-semibold py-3.5 px-2 no-underline"
                style={{ color: '#C9A84C' }}
              >
                <FiPhone size={16} /> +212 611 460 900
              </a>
              <a
                href="https://wa.me/212611460900"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 font-semibold py-3.5 px-2 no-underline"
                style={{ color: '#25D366' }}
              >
                <FaWhatsapp size={16} /> WhatsApp
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
