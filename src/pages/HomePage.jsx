import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaWhatsapp } from 'react-icons/fa'
import { FiMapPin, FiAward } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import Hero from '../components/Hero'
import CarsSection from './CarsSection'
import WhySection from './WhySection'
import ProcessSection from './ProcessSection'
import ReviewsSection from './ReviewsSection'
import ContactSection from './ContactSection'

export default function HomePage() {
  const location = useLocation()
  const { addToast } = useApp()

  useEffect(() => {
    if (location.state?.adminDenied) {
      addToast('Accès administrateur refusé.', 'error')
      window.history.replaceState({}, document.title)
    }
  }, [location.state, addToast])

  return (
    <>
      <Hero />
      <PremiumMarquee />
      <CarsSection />
      <WhySection />
      <ProcessSection />
      <SeoLocalSection />
      <ReviewsSection />
      <LuxuryCta />
      <ContactSection />
      <FloatingWhatsApp />
    </>
  )
}

const MARQUEE_ITEMS = [
  { text: 'Oujda · Nador · Berkane', icon: '◆' },
  { text: 'Réservation en 3 minutes', icon: '◆' },
  { text: 'Livraison à domicile', icon: '◆' },
  { text: 'Assurance tous risques', icon: '◆' },
  { text: 'Pas de caution', icon: '◆' },
  { text: 'Pas de chèque', icon: '◆' },
  { text: 'Paiement flexible', icon: '◆' },
  { text: 'Service premium 24/7', icon: '◆' },
]

function PremiumMarquee() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <div className="marquee-bar-bg relative z-[2]" style={{ paddingTop: '13px', paddingBottom: '13px' }}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'rgba(255,255,255,0.22)' }} />
      <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'rgba(0,0,0,0.18)' }} />
      <div className="marquee-root" aria-hidden="true">
        <div className="marquee-track">
          {doubled.map((item, i) => (
            <span key={`${item.text}-${i}`} className="marquee-item">
              <span className="marquee-divider" style={{ fontSize: '8px', marginRight: '26px' }}>
                {item.icon}
              </span>
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SeoLocalSection() {
  const { scrollTo } = useApp()
  const locations = [
    { city: 'Oujda', desc: "Livraison dans toute la ville et à l'aéroport Angad.", icon: '🏙️' },
    { city: 'Nador', desc: "Service premium au port et à l'aéroport Al Aroui.", icon: '⚓' },
    { city: 'Berkane', desc: 'Couverture complète de la région des agrumes.', icon: '🌿' },
  ]

  return (
    <section
      className="relative py-20 px-4 sm:px-10 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0D1A2A 0%, #080E18 100%)' }}
      aria-label="Zones de service location voiture Oriental Maroc"
    >
      <div className="max-w-[1360px] mx-auto">
        <div className="text-center mb-12">
          <div className="section-label mb-4 mx-auto w-fit">
            <FiMapPin className="inline mr-1.5" size={10} />
            Nos Zones de Service
          </div>
          <h2 className="font-display font-bold text-white text-[clamp(2rem,3.5vw,3.2rem)] leading-tight">
            Location Voiture dans<br />
            <em className="text-gold">Toute la Région Orientale</em>
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-sm font-light leading-[1.8] text-white/35">
            HM Houti Cars vous livre votre véhicule de luxe où vous en avez besoin — Oujda, Nador, Berkane et alentours.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {locations.map((loc, i) => (
            <motion.div
              key={loc.city}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative p-8 text-center group cursor-pointer transition-all duration-300"
              style={{ background: '#080E18' }}
              onClick={() => scrollTo('contact')}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#080E18' }}
            >
              <div className="text-4xl mb-4">{loc.icon}</div>
              <h3 className="font-condensed font-black text-[1.6rem] text-white mb-2 group-hover:text-gold transition-colors">
                {loc.city}
              </h3>
              <p className="text-sm font-light text-white/40 leading-[1.7]">
                Location voiture {loc.city} — {loc.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LuxuryCta() {
  const { scrollTo } = useApp()

  return (
    <section
      id="cta"
      className="relative overflow-hidden px-4 py-24 sm:px-10"
      style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C76A 50%, #C9A84C 100%)' }}
      aria-label="Réserver une voiture à Oujda"
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden font-condensed text-[18vw] font-black leading-none tracking-[-8px] text-black/[0.05] select-none pointer-events-none">
        RÉSERVER
      </div>
      <div className="relative z-10 mx-auto flex max-w-[1360px] flex-col gap-10 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FiAward size={14} style={{ color: '#0B1623' }} />
            <span className="font-condensed text-[11px] font-bold uppercase tracking-[2px] text-[#0B1623]/60">
              Satisfaction Garantie
            </span>
          </div>
          <h2 className="font-display text-[clamp(2.2rem,4.5vw,4.2rem)] font-bold leading-[0.92] text-[#080E18]">
            Prêt à Vivre<br /><em>L'Expérience?</em>
          </h2>
          <p className="mt-4 text-sm text-black/50">Disponible 24h/24 · Livraison immédiate · Tarifs transparents</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => scrollTo('cars')}
            className="rounded px-10 py-4 font-condensed text-[13px] font-extrabold uppercase tracking-[2px] transition-all duration-200"
            style={{ background: '#080E18', color: '#C9A84C' }}
          >
            Voir la Flotte →
          </button>
          <a
            href="https://wa.me/212611460900"
            target="_blank"
            rel="noreferrer noopener"
            className="rounded border-2 border-black/20 px-9 py-4 font-condensed text-[13px] font-bold uppercase tracking-[2px] text-[#080E18] no-underline transition hover:bg-black/10 flex items-center gap-2"
          >
            <FaWhatsapp size={16} /> WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}

function FloatingWhatsApp() {
  return (
    <motion.a
      href="https://wa.me/212611460900"
      target="_blank"
      rel="noreferrer noopener"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-6 right-5 z-[300] flex items-center text-white no-underline"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(37,211,102,0.4))' }}
      aria-label="Contacter HM Houti Cars sur WhatsApp"
    >
      <div
        className="absolute inset-0 rounded-full animate-ping pointer-events-none"
        style={{ background: 'rgba(37,211,102,0.3)', animationDuration: '2.4s' }}
      />
      <div
        className="relative w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 20px rgba(37,211,102,0.45)' }}
      >
        <FaWhatsapp size={26} />
      </div>
    </motion.a>
  )
}
