import React from 'react'
import { motion } from 'framer-motion'
import { FaWhatsapp } from 'react-icons/fa'
import { useApp } from '../context/AppContext'
import { HERO_STATS } from '../data'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
})

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5, delay },
})

export default function Hero() {
  const { scrollTo } = useApp()

  return (
    <section
      id="home"
      className="min-h-screen flex items-center px-4 sm:px-10 relative overflow-hidden"
      style={{
        background: 'linear-gradient(100deg, rgba(8,14,24,0.98) 0%, rgba(8,14,24,0.82) 42%, rgba(8,14,24,0.32) 100%), linear-gradient(to top, rgba(8,14,24,0.96) 0%, rgba(8,14,24,0.22) 58%, transparent 100%), url("https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/interface%20houticars.png") center 30% / cover',
        paddingTop: '124px',
        paddingBottom: '96px',
      }}
    >
      <motion.div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 46% at 72% 34%, rgba(201,168,76,0.10) 0%, transparent 70%), radial-gradient(ellipse 42% 34% at 18% 86%, rgba(20,37,58,0.72) 0%, transparent 70%)' }} />
      <motion.div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.45) 1px,transparent 1px)', backgroundSize: '80px 80px', maskImage: 'linear-gradient(to right, transparent 0%, black 24%, black 76%, transparent 100%)' }} />
      <motion.div className="absolute left-[62%] top-16 h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(201,168,76,0.075)' }} />
      <motion.div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none" style={{ background: 'rgba(201,168,76,0.15)' }} />

      <motion.div className="max-w-[1360px] mx-auto w-full relative z-10">
        <motion.div className="max-w-[880px]">
          <motion.div {...fadeIn(0.1)} className="mb-6">
            <span className="inline-flex items-center gap-3 text-[11px] font-bold tracking-[3px] uppercase px-5 py-2 rounded-full backdrop-blur-md" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse2" style={{ background: '#C9A84C' }} />
              Location Luxe · Oujda · Nador · Berkane
            </span>
          </motion.div>

          <motion.h1 {...fadeUp(0.2)} className="font-display font-bold text-white mb-7 tracking-[-0.04em]" style={{ fontSize: 'clamp(4rem, 9vw, 8.8rem)', lineHeight: 0.86 }}>
            L'Excellence<br />
            <em style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C76A, #fff6d6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Automobile</em>
            <br />à Votre Service
          </motion.h1>

          <motion.p {...fadeUp(0.35)} className="font-light" style={{ color: 'rgba(255,255,255,0.58)', fontSize: 17, lineHeight: 1.9, marginBottom: 46, maxWidth: 560 }}>
            Des véhicules haut de gamme, une réservation fluide et une livraison précise dans toute la région orientale. Une expérience, pas juste une location.
          </motion.p>

          <motion.div {...fadeUp(0.5)} className="flex gap-4 flex-wrap">
            <button onClick={() => scrollTo('cars')} className="btn-gold text-[13px] px-11 py-4 shadow-[0_20px_55px_rgba(201,168,76,0.32)]">Découvrir la Flotte →</button>
            <a href="https://wa.me/212611460900" target="_blank" rel="noreferrer" className="btn-ghost flex items-center gap-2 text-[13px] px-9 py-4 no-underline">
              <FaWhatsapp style={{ color: '#25D366' }} /> WhatsApp
            </a>
          </motion.div>

          <motion.div {...fadeUp(0.6)} className="flex gap-10 mt-16 pt-10 flex-wrap max-w-[720px]" style={{ borderTop: '1px solid rgba(201,168,76,0.14)' }}>
            {HERO_STATS.map(({ num, label }) => (
              <motion.div key={label}>
                <motion.div className="font-condensed font-black text-[2rem] leading-none" style={{ color: '#C9A84C' }}>{num}</motion.div>
                <motion.div className="text-[11px] font-medium uppercase tracking-[1.5px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</motion.div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
