import React, { useEffect } from 'react'
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
  const scrolled = useScrolled(30)
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
    setMobileOpen(false)
    navigate('/')
    setTimeout(() => scrollTo(id), 100)
  }

  const displayName = profile?.full_name?.split(' ')[0] || 'Mon espace'
  const initials = getInitials(profile?.full_name)

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <div
        className="py-2.5 px-4 sm:px-10 text-center text-xs"
        style={{
          background: 'linear-gradient(90deg, #060d17, #0d1e31)',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          color: '#6a7889',
        }}
      >
        🎉 Offre spéciale —{' '}
        <span style={{ color: '#C9A84C', fontWeight: 700 }}>
          -10% sur toute location de 7 jours et plus.
        </span>
        <span className="hidden sm:inline" style={{ color: '#6a7889' }}>
          {' '}Contactez-nous sur WhatsApp!
        </span>
      </div>

      <motion.nav
        animate={{
          background: scrolled ? 'rgba(8,14,24,0.92)' : '#080E18',
          backdropFilter: scrolled ? 'blur(24px)' : 'blur(0px)',
          borderBottomColor: scrolled ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.05)',
        }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between px-4 sm:px-10 h-[70px] border-b"
        style={{ boxShadow: scrolled ? '0 4px 40px rgba(0,0,0,0.5)' : 'none' }}
      >
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none group"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-condensed font-bold text-sm shrink-0 transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C76A)', color: '#0B1623' }}
          >
            HM
          </div>
          <div className="flex flex-col leading-none text-left">
            <span
              className="text-white text-[16px] font-bold tracking-[0.3px]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Houti Cars
            </span>
            <span
              className="text-[9px] font-bold tracking-[2.5px] uppercase mt-0.5"
              style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}
            >
              Oujda · Nador · Berkane
            </span>
          </div>
        </button>

        <ul className="hidden md:flex gap-8 list-none m-0 p-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleNavClick(item.id)}
                className="relative text-[13px] font-medium pb-1 transition-colors duration-200 cursor-pointer bg-transparent border-none"
                style={{
                  color: activeSection === item.id ? '#fff' : 'rgba(255,255,255,0.45)',
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                {item.label}
                {activeSection === item.id && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-0.5 left-0 right-0 h-px rounded-sm"
                    style={{ background: '#C9A84C' }}
                  />
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://wa.me/212611460900"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg font-condensed text-[11px] font-bold uppercase tracking-[1.5px] no-underline transition-all"
            style={{
              color: '#25D366',
              border: '1px solid rgba(37,211,102,0.2)',
              background: 'rgba(37,211,102,0.05)',
            }}
          >
            <FaWhatsapp size={14} /> WhatsApp
          </a>
          <a
            href="tel:+212611460900"
            className="hidden lg:flex items-center gap-1.5 text-[12px] font-medium no-underline transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'Outfit, sans-serif' }}
          >
            <FiPhone style={{ color: '#C9A84C', opacity: 0.8 }} />
            +212 611 460 900
          </a>

          {user ? (
            <div className="hidden md:flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-1.5 text-[12px] font-medium cursor-pointer bg-transparent border-none transition-colors hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'Outfit, sans-serif' }}
                >
                  <FiGrid style={{ color: '#C9A84C' }} /> Admin
                </button>
              )}
              <button
                type="button"
                className="mon-espace-btn"
                onClick={() => navigate('/dashboard')}
                aria-label="Mon espace"
              >
                <span className="mon-espace-avatar">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-[8px]" />
                  ) : (
                    initials
                  )}
                </span>
                <span className="hidden sm:inline" style={{ fontSize: 13, fontWeight: 600 }}>
                  {displayName}
                </span>
                <FiChevronRight className="mon-espace-chevron" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="cursor-pointer bg-transparent border-none p-1.5 rounded-lg transition-all hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                title="Déconnexion"
              >
                <FiLogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="text-[13px] font-medium cursor-pointer bg-transparent border-none transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Outfit, sans-serif' }}
              >
                Connexion
              </button>
              <button type="button" onClick={() => scrollTo('cars')} className="btn-gold text-[11px] px-5 py-2.5">
                Réserver
              </button>
            </div>
          )}

          <button
            type="button"
            className="md:hidden flex flex-col gap-[5px] cursor-pointer p-1.5 bg-transparent border-none"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            <span
              className="block w-5 h-0.5 bg-white rounded-sm transition-all duration-300"
              style={{ transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : '' }}
            />
            <span
              className="block w-5 h-0.5 bg-white rounded-sm transition-opacity duration-300"
              style={{ opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block w-5 h-0.5 bg-white rounded-sm transition-all duration-300"
              style={{ transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : '' }}
            />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[185] backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 bottom-0 right-0 w-[290px] z-[190] px-6 py-8 flex flex-col gap-1 overflow-y-auto"
              style={{ background: '#090f1a', borderLeft: '1px solid rgba(201,168,76,0.1)' }}
            >
              <button
                type="button"
                className="self-end mb-4 bg-transparent border-none cursor-pointer w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer"
              >
                ✕
              </button>

              {user && (
                <div
                  className="flex items-center gap-3 mb-4 p-4 rounded-xl"
                  style={{
                    background: 'rgba(201,168,76,0.07)',
                    border: '1px solid rgba(201,168,76,0.2)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[13px] font-black font-condensed shrink-0 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C76A)', color: '#080E18' }}
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold leading-tight">
                      {profile?.full_name || 'Utilisateur'}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#C9A84C' }}>
                      {isAdmin ? 'Administrateur' : 'Compte actif'}
                    </div>
                  </div>
                </div>
              )}

              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className="text-[15px] font-semibold py-3.5 text-left cursor-pointer bg-transparent border-none border-b transition-all hover:text-white hover:pl-1"
                  style={{
                    color: activeSection === item.id ? '#C9A84C' : 'rgba(255,255,255,0.45)',
                    borderColor: 'rgba(255,255,255,0.04)',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {item.label}
                </button>
              ))}

              <div className="mt-4 flex flex-col gap-1">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { navigate('/dashboard'); setMobileOpen(false) }}
                      className="flex items-center gap-2 font-semibold py-3 cursor-pointer bg-transparent border-none text-left"
                      style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}
                    >
                      <FiUser /> Mon Espace
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => { navigate('/admin'); setMobileOpen(false) }}
                        className="flex items-center gap-2 font-semibold py-3 cursor-pointer bg-transparent border-none text-left"
                        style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}
                      >
                        <FiGrid /> Admin
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-2 font-semibold py-3 cursor-pointer bg-transparent border-none text-left text-red-400"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <FiLogOut /> Déconnexion
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { openAuth('login'); setMobileOpen(false) }}
                    className="flex items-center gap-2 font-semibold py-3 cursor-pointer bg-transparent border-none text-left"
                    style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}
                  >
                    <FiUser /> Connexion / Inscription
                  </button>
                )}
              </div>

              <div className="flex gap-3 mt-3">
                <a
                  href="https://wa.me/212611460900"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-condensed text-[12px] font-bold uppercase no-underline"
                  style={{
                    background: 'rgba(37,211,102,0.08)',
                    color: '#25D366',
                    border: '1px solid rgba(37,211,102,0.2)',
                  }}
                >
                  <FaWhatsapp size={15} /> WhatsApp
                </a>
                <a
                  href="tel:+212611460900"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-condensed text-[12px] font-bold uppercase no-underline"
                  style={{
                    background: 'rgba(201,168,76,0.07)',
                    color: '#C9A84C',
                    border: '1px solid rgba(201,168,76,0.2)',
                  }}
                >
                  <FiPhone size={14} /> Appeler
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
