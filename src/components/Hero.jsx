import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FaWhatsapp } from 'react-icons/fa'
import { useApp } from '../context/AppContext'
import { HERO_STATS } from '../data'

export default function Hero() {
  const { scrollTo } = useApp()

  return (
    <section
      id="home"
      className="min-h-screen flex items-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(110deg, rgba(8,14,24,0.99) 0%, rgba(8,14,24,0.88) 45%, rgba(8,14,24,0.4) 100%), linear-gradient(to top, rgba(8,14,24,1) 0%, rgba(8,14,24,0.2) 55%, transparent 100%), url("https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/interface%20houticars.png") center 30% / cover no-repeat',
        paddingTop: '130px',
        paddingBottom: '100px',
        paddingLeft: 'clamp(1rem, 5vw, 4rem)',
        paddingRight: 'clamp(1rem, 5vw, 4rem)',
      }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[55%] w-[700px] h-[700px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #C9A84C, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] opacity-[0.06]" style={{ background: 'radial-gradient(circle, #1a3a6e, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.5) 1px,transparent 1px)', backgroundSize: '90px 90px', maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)' }} />

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)' }} />

      <div className="max-w-[1400px] mx-auto w-full relative z-10">
        <div className="max-w-[920px]">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2.5 text-[11px] font-bold tracking-[3px] uppercase px-5 py-2.5 rounded-full" style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse2" style={{ background: '#C9A84C' }} />
              Location Premium · Oujda · Nador · Berkane
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16,1,0.3,1] }}
            className="font-display text-white mb-8"
            style={{ fontSize: 'clamp(4.2rem, 10vw, 9.5rem)', lineHeight: 0.86, fontWeight: 800, letterSpacing: '-0.03em' }}
          >
            L'Excellence<br />
            <em style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C76A 40%, #fff8e0 70%, #C9A84C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}>
              Automobile
            </em>
            <br />
            <span style={{ fontSize: '0.62em', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>à Votre Service</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: 'easeOut' }}
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17, lineHeight: 1.95, marginBottom: 52, maxWidth: 520, fontWeight: 300 }}
          >
            Des véhicules haut de gamme, une réservation fluide et une livraison précise dans toute la région orientale. Une expérience, pas juste une location.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex gap-4 flex-wrap mb-20"
          >
            <button
              onClick={() => scrollTo('cars')}
              className="btn-gold text-[12px] px-10 py-4"
              style={{ boxShadow: '0 20px 50px rgba(201,168,76,0.28)' }}
            >
              Découvrir la Flotte →
            </button>
            <a
              href="https://wa.me/212611460900"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-[12px] px-9 py-4 no-underline"
            >
              <FaWhatsapp size={16} style={{ color: '#25D366' }} />
              WhatsApp
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex gap-10 pt-10 flex-wrap"
            style={{ borderTop: '1px solid rgba(201,168,76,0.12)' }}
          >
            {HERO_STATS.map(({ num, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 + i * 0.1 }}
              >
                <div className="font-condensed font-black leading-none mb-1" style={{ fontSize: '2.4rem', color: '#C9A84C' }}>{num}</div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 3, fontWeight: 600, textTransform: 'uppercase' }}
      >
        <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, rgba(201,168,76,0.4), transparent)' }} />
        <span>Défiler</span>
      </motion.div>
    </section>
  )
}
