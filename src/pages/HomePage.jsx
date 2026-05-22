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
    if (location.state?.authRequired) {
      addToast('Connectez-vous pour accéder à cette page.', 'error')
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
    <div className="relative z-[2] overflow-hidden bg-gold py-3.5">
      <div className="ticker-track flex w-max">
        {[...items, ...items].map((item, i) => (
          <div key={`${item}-${i}`} className="font-condensed text-[13px] font-extrabold uppercase tracking-[3px] text-[#080E18] whitespace-nowrap px-8 flex items-center gap-4">
            {item}
            <span className="opacity-40">✦</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LuxuryCta() {
  const { scrollTo } = useApp()

  return (
    <section id="cta" className="relative overflow-hidden bg-gold px-4 py-24 sm:px-10">
      <div className="absolute inset-[-20px] flex items-center justify-center overflow-hidden font-condensed text-[20vw] font-black leading-none tracking-[-10px] text-black/[0.06] select-none pointer-events-none">
        RÉSERVER
      </div>
      <div className="relative z-10 mx-auto flex max-w-[1360px] flex-col gap-10 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-[clamp(2.4rem,5vw,4.6rem)] font-bold leading-[0.92] text-[#080E18]">
            Prêt à Vivre<br /><em>L'Expérience?</em>
          </h2>
          <p className="mt-4 text-sm text-black/55">Disponible 24h/24 · Livraison immédiate · Tarifs transparents</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => scrollTo('cars')} className="rounded bg-[#080E18] px-10 py-4 font-condensed text-[13px] font-extrabold uppercase tracking-[2px] text-gold transition hover:-translate-y-0.5 hover:bg-[#14253A]">
            Voir la Flotte →
          </button>
          <a href="https://wa.me/212611460900" target="_blank" rel="noreferrer" className="rounded border-2 border-black/25 px-9 py-4 font-condensed text-[13px] font-bold uppercase tracking-[2px] text-[#080E18] no-underline transition hover:bg-black/10">
            WhatsApp Direct
          </a>
        </div>
      </div>
    </section>
  )
}
