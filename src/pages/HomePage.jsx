import React, { useEffect, useRef } from 'react'
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
      <PremiumMarquee />
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

/* ─── Premium Marquee ─────────────────────────────────── */

const MARQUEE_ITEMS = [
  { text: 'Oujda · Nador · Berkane',   icon: '◆' },
  { text: 'Réservation en 3 minutes',  icon: '◆' },
  { text: 'Livraison à domicile',       icon: '◆' },
  { text: 'Assurance tous risques',     icon: '◆' },
  { text: 'Pas de caution',             icon: '◆' },
  { text: 'Pas de chèque',              icon: '◆' },
  { text: 'Paiement flexible',          icon: '◆' },
  { text: 'Service premium 24/7',       icon: '◆' },
  { text: 'Support WhatsApp instantané',icon: '◆' },
]

function PremiumMarquee() {
  // Duplicate for seamless loop: track = [items × 4] → animation shifts by 50%
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <div
      className="marquee-bar-bg relative z-[2]"
      style={{ paddingTop: '13px', paddingBottom: '13px' }}
    >
      {/* Top micro-line for extra luxury depth */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'rgba(255,255,255,0.22)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'rgba(0,0,0,0.18)',
        }}
      />

      <div className="marquee-root" aria-hidden="true">
        <div className="marquee-track">
          {doubled.map((item, i) => (
            <span key={`${item.text}-${i}`} className="marquee-item" style={{ gap: 0 }}>
              <span
                className="marquee-divider"
                style={{
                  fontSize: '8px',
                  color: 'rgba(8,14,24,0.4)',
                  marginRight: '26px',
                  letterSpacing: 0,
                }}
              >
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

/* ─── Luxury CTA ──────────────────────────────────────── */

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
          <button
            onClick={() => scrollTo('cars')}
            className="rounded bg-[#080E18] px-10 py-4 font-condensed text-[13px] font-extrabold uppercase tracking-[2px] text-gold transition hover:-translate-y-0.5 hover:bg-[#14253A]"
          >
            Voir la Flotte →
          </button>
          <a
            href="https://wa.me/212611460900"
            target="_blank"
            rel="noreferrer"
            className="rounded border-2 border-black/25 px-9 py-4 font-condensed text-[13px] font-bold uppercase tracking-[2px] text-[#080E18] no-underline transition hover:bg-black/10"
          >
            WhatsApp Direct
          </a>
        </div>
      </div>
    </section>
  )
}
