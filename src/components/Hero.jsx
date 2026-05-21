import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FaWhatsapp } from 'react-icons/fa'
import { FiMapPin, FiShield, FiClock } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { HERO_STATS } from '../data'

const BG_IMAGE = 'https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/interface%20houticars.png'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
})

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.6, delay },
})

const TRUST_PILLS = [
  { icon: <FiMapPin size={11} />, text: 'Oujda · Nador · Berkane' },
  { icon: <FiShield size={11} />, text: 'Assurance Tous Risques' },
  { icon: <FiClock size={11} />, text: 'Disponible 24h/24' },
]

export default function Hero() {
  const { scrollTo } = useApp()
  const parallaxRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!parallaxRef.current) return
      const y = window.scrollY * 0.25
      parallaxRef.current.style.transform = `translate3d(0, ${y}px, 0) scale(1.08)`
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      aria-label="Location voiture luxe Oujda Nador Berkane"
      style={{ paddingTop: 124, paddingBottom: 96 }}
    >
      {/* Parallax BG */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          ref={parallaxRef}
          className="absolute inset-[-8%] bg-center bg-cover will-change-transform"
          style={{ backgroundImage: `url(${BG_IMAGE})`, backgroundPosition: 'center 30%' }}
        />
        {/* Dark overlays */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(8,14,24,0.97) 0%, rgba(8,14,24,0.85) 45%, rgba(8,14,24,0.35) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,14,24,0.98) 0%, rgba(8,14,24,0.2) 55%, transparent 100%)' }} />
      </div>

      {/* Ambient glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="absolute left-[58%] top-[20%] w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.09) 0%, transparent 65%)', transform: 'translate(-50%, -50%)' }}
      />

      {/* Gold grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.5) 1px,transparent 1px)', backgroundSize: '90px 90px', maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)' }} />

      {/* Bottom separator */}
      <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)' }} />

      {/* Content */}
      <div className="max-w-[1360px] mx-auto w-full px-4 sm:px-10 relative z-10">
        <div className="max-w-[900px]">

          {/* Location badge */}
          <motion.div {...fadeIn(0.1)} className="mb-6 flex flex-wrap gap-2">
            {TRUST_PILLS.map((p) => (
              <span
                key={p.text}
                className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[2px] uppercase px-4 py-1.5 rounded-full backdrop-blur-md"
                style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}
              >
                {p.icon}
                {p.text}
              </span>
            ))}
          </motion.div>

          {/* Main heading — SEO H1 */}
          <motion.h1
            {...fadeUp(0.2)}
            className="font-display font-bold text-white mb-7 tracking-[-0.04em]"
            style={{ fontSize: 'clamp(3.6rem, 8.5vw, 8.2rem)', lineHeight: 0.88 }}
          >
            L'Excellence<br />
            <em style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C76A 40%, #fff6d6 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Automobile
            </em>
            <br />à Votre Service
          </motion.h1>

          {/* Subheading — SEO-rich */}
          <motion.p
            {...fadeUp(0.35)}
            style={{ color: 'rgba(255,255,255,0.55)', fontSize: 17, lineHeight: 1.95, marginBottom: 46, maxWidth: 580 }}
          >
            Location de voiture de prestige à <strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Oujda, Nador et Berkane</strong>.
            Véhicules 2024–2025, livraison à domicile, assurance tous risques.
            Une expérience, pas juste une location.
          </motion.p>

          {/* CTAs */}
          <motion.div {...fadeUp(0.5)} className="flex gap-4 flex-wrap">
            <button
              onClick={() => scrollTo('cars')}
              className="btn-gold text-[13px] px-11 py-4"
              style={{ boxShadow: '0 20px 55px rgba(201,168,76,0.28), 0 0 0 1px rgba(201,168,76,0.15)' }}
              aria-label="Voir la flotte de voitures"
            >
              Découvrir la Flotte →
            </button>
            <a
              href="https://wa.me/212611460900"
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost flex items-center gap-2 text-[13px] px-9 py-4 no-underline"
              aria-label="Contacter HM Houti Cars sur WhatsApp"
            >
              <FaWhatsapp style={{ color: '#25D366' }} size={16} />
              WhatsApp Direct
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            {...fadeUp(0.65)}
            className="flex gap-8 mt-16 pt-10 flex-wrap max-w-[720px]"
            style={{ borderTop: '1px solid rgba(201,168,76,0.12)' }}
          >
            {HERO_STATS.map(({ num, label }) => (
              <div key={label} className="relative">
                <div className="font-condensed font-black text-[2.1rem] leading-none" style={{ color: '#C9A84C' }}>
                  {num}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[1.8px] mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2"
        style={{ color: 'rgba(255,255,255,0.2)' }}
        aria-hidden="true"
      >
        <span className="text-[9px] font-bold tracking-[2.5px] uppercase">Défiler</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-8"
          style={{ background: 'linear-gradient(to bottom, rgba(201,168,76,0.5), transparent)' }}
        />
      </motion.div>
    </section>
  )
}
