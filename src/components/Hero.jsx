import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FaWhatsapp } from 'react-icons/fa'
import { useApp } from '../context/AppContext'
import { HERO_STATS } from '../data'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
})

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.6, delay },
})

export default function Hero() {
  const { scrollTo } = useApp()

  return (
    <section
      id="home"
      className="min-h-screen flex items-center px-4 sm:px-10 relative overflow-hidden"
      style={{
        background: [
          'linear-gradient(105deg, rgba(8,14,24,0.99) 0%, rgba(8,14,24,0.88) 38%, rgba(8,14,24,0.38) 100%)',
          'linear-gradient(to top, rgba(8,14,24,0.98) 0%, rgba(8,14,24,0.30) 52%, transparent 100%)',
          'url("https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/interface%20houticars.png") center 30% / cover',
        ].join(', '),
        paddingTop: '124px',
        paddingBottom: '96px',
      }}
    >
      {/* ── Ambient glow layers ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse 65% 50% at 74% 32%, rgba(201,168,76,0.11) 0%, transparent 70%)',
            'radial-gradient(ellipse 44% 36% at 16% 88%, rgba(20,37,58,0.75) 0%, transparent 70%)',
          ].join(', '),
        }}
      />

      {/* ── Grid overlay (subtle) ── */}
      <div
        className="absolute inset-0 pointer-events-none hero-shimmer-overlay"
        style={{
          backgroundImage: 'linear-gradient(rgba(201,168,76,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.3) 1px,transparent 1px)',
          backgroundSize: '80px 80px',
          opacity: 0.04,
          maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
        }}
      />

      {/* ── Central glow sphere ── */}
      <div
        className="absolute left-[64%] top-1/4 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/4 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(201,168,76,0.065)' }}
      />

      {/* ── Bottom separator line ── */}
      <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none hero-stat-line" />

      {/* ── Content ── */}
      <div className="max-w-[1360px] mx-auto w-full relative z-10">
        <div className="max-w-[920px]">

          {/* Badge */}
          <motion.div {...fadeIn(0.1)} className="mb-7">
            <span
              className="inline-flex items-center gap-3 text-[10.5px] font-bold tracking-[3.5px] uppercase px-5 py-2.5 rounded-full backdrop-blur-md"
              style={{
                background: 'rgba(201,168,76,0.07)',
                border: '1px solid rgba(201,168,76,0.28)',
                color: '#C9A84C',
                boxShadow: '0 0 24px rgba(201,168,76,0.06)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#C9A84C',
                  boxShadow: '0 0 6px rgba(201,168,76,0.7)',
                  animation: 'pulse2 2s ease-in-out infinite',
                }}
              />
              Location Luxe · Oujda · Nador · Berkane
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            {...fadeUp(0.18)}
            className="font-display font-bold text-white mb-8 tracking-[-0.04em]"
            style={{ fontSize: 'clamp(3.8rem, 8.8vw, 8.6rem)', lineHeight: 0.87 }}
          >
            L'Excellence<br />
            <em
              style={{
                background: 'linear-gradient(135deg, #C9A84C 0%, #E8C76A 45%, #fff8dc 70%, #E8C76A 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Automobile
            </em>
            <br />
            <span style={{ color: 'rgba(255,255,255,0.82)' }}>à Votre Service</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            {...fadeUp(0.32)}
            style={{
              color: 'rgba(255,255,255,0.52)',
              fontSize: 17,
              lineHeight: 1.9,
              marginBottom: 48,
              maxWidth: 560,
              fontWeight: 300,
            }}
          >
            Des véhicules haut de gamme, une réservation fluide et une livraison précise dans toute la région orientale.
            Une expérience, pas juste une location.
          </motion.p>

          {/* CTAs */}
          <motion.div {...fadeUp(0.46)} className="flex gap-4 flex-wrap">
            <button
              onClick={() => scrollTo('cars')}
              className="btn-gold cta-gold-pulse text-[13px] px-12 py-4"
              style={{ borderRadius: '10px' }}
            >
              Découvrir la Flotte →
            </button>
            <a
              href="https://wa.me/212611460900"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost flex items-center gap-2.5 text-[13px] px-10 py-4 no-underline"
              style={{ borderRadius: '10px' }}
            >
              <FaWhatsapp style={{ color: '#25D366', fontSize: 16 }} />
              WhatsApp
            </a>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            {...fadeUp(0.58)}
            className="flex gap-10 mt-16 pt-10 flex-wrap max-w-[720px]"
            style={{ borderTop: '1px solid rgba(201,168,76,0.13)' }}
          >
            {HERO_STATS.map(({ num, label }) => (
              <div key={label} className="group">
                <div
                  className="font-condensed font-black text-[2.1rem] leading-none transition-colors duration-300 group-hover:text-gold-light"
                  style={{ color: '#C9A84C' }}
                >
                  {num}
                </div>
                <div
                  className="text-[10.5px] font-medium uppercase tracking-[1.8px] mt-1.5"
                  style={{ color: 'rgba(255,255,255,0.32)' }}
                >
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
