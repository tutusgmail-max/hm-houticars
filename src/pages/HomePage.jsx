import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FaWhatsapp } from 'react-icons/fa'
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
      <LuxuryTicker />
      <CarsSection />
      <WhySection />
      <ProcessSection />
      <ReviewsSection />
      <LuxuryCta />
      <ContactSection />
      <a href="https://wa.me/212611460900" target="_blank" rel="noreferrer" className="wa-float text-white" aria-label="WhatsApp">
        <FaWhatsapp size={28} />
      </a>
    </>
  )
}

function LuxuryTicker() {
  const items = [
    'Location Premium',
    'Véhicules 2024–2025',
    'Livraison à Domicile',
    'Assurance Tous Risques',
    'Oujda · Nador · Berkane',
    'Réservation en 3 Minutes',
  ]
  return (
    <div className="relative z-[2] overflow-hidden py-3.5" style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C76A)' }}>
      <div className="ticker-track flex w-max">
        {[...items, ...items].map((item, i) => (
          <div key={`${item}-${i}`} className="whitespace-nowrap px-8 flex items-center gap-4" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: '#080E18' }}>
            {item}
            <span style={{ opacity: 0.35 }}>✦</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LuxuryCta() {
  const { scrollTo } = useApp()
  return (
    <section id="cta" className="relative overflow-hidden px-4 py-28 sm:px-10" style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C76A 50%, #C9A84C 100%)' }}>
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden font-condensed font-black pointer-events-none select-none" style={{ fontSize: 'clamp(6rem,18vw,16rem)', color: 'rgba(0,0,0,0.05)', letterSpacing: '-8px', lineHeight: 1 }}>
        RÉSERVER
      </div>
      {/* Geometric element */}
      <div className="absolute right-[5%] top-1/2 -translate-y-1/2 w-64 h-64 rounded-full hidden xl:block" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }} />
      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col gap-12 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-[#080E18] mb-3" style={{ fontSize: 'clamp(2.6rem, 6vw, 5.5rem)', fontWeight: 800, lineHeight: 0.9 }}>
            Prêt à Vivre<br /><em>L'Expérience?</em>
          </h2>
          <p className="text-[13px] font-medium" style={{ color: 'rgba(8,14,24,0.5)' }}>Disponible 24h/24 · Livraison immédiate · Tarifs transparents</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => scrollTo('cars')} className="text-[12px] font-bold uppercase tracking-[2px] px-10 py-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl" style={{ background: '#080E18', color: '#C9A84C', border: 'none', fontFamily: 'Outfit, sans-serif', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            Voir la Flotte →
          </button>
          <a href="https://wa.me/212611460900" target="_blank" rel="noreferrer" className="text-[12px] font-bold uppercase tracking-[2px] px-9 py-4 rounded-xl no-underline transition-all hover:-translate-y-0.5 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.12)', border: '2px solid rgba(0,0,0,0.2)', color: '#080E18', fontFamily: 'Outfit, sans-serif' }}>
            WhatsApp Direct
          </a>
        </div>
      </div>
    </section>
  )
}
