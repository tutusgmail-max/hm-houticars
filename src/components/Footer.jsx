import React from 'react'
import { FaWhatsapp, FaInstagram } from 'react-icons/fa'
import { FiPhone, FiMail, FiMapPin } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { FOOTER_NAV, FOOTER_CATS } from '../data'

export default function Footer() {
  const { scrollTo } = useApp()
  const navigate = useNavigate()

  const handleNav = (id) => {
    navigate('/')
    setTimeout(() => scrollTo(id), 100)
  }

  const year = new Date().getFullYear()

  return (
    <footer
      className="luxury-section-line relative bg-[#050A11] px-4 pb-10 pt-20 sm:px-10"
      itemScope
      itemType="https://schema.org/WPFooter"
      aria-label="Pied de page HM Houti Cars"
    >
      <div className="mx-auto max-w-[1360px]">

        {/* Trust strip */}
        <div className="mb-14 flex flex-wrap gap-3 items-center justify-center lg:justify-start">
          {['✓ Assurance Tous Risques', '✓ Livraison à Domicile', '✓ Flotte 2024–2025', '✓ Service 24h/24', '✓ Prix Transparents'].map((item) => (
            <span key={item} className="trust-badge">{item}</span>
          ))}
        </div>

        <div className="mb-14 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr] lg:gap-16">

          {/* Brand */}
          <div>
            <button
              onClick={() => handleNav('home')}
              className="mb-5 block bg-transparent p-0 text-left font-condensed text-[1.7rem] font-black text-white cursor-pointer"
              aria-label="HM Houti Cars – Accueil"
            >
              HM<span style={{ color: '#C9A84C' }}>HOUTI</span>CARS
            </button>
            <p className="max-w-[280px] text-[13px] font-light leading-[1.85] text-white/30">
              Location automobile de prestige à <strong className="text-white/50 font-medium">Oujda, Nador et Berkane</strong>.
              Excellence, confiance, et service irréprochable dans toute la région orientale du Maroc.
            </p>
            <div className="flex gap-3 mt-6">
              <a
                href="https://wa.me/212611460900"
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-10 w-10 items-center justify-center rounded border no-underline transition-all duration-200"
                style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(37,211,102,0.3)'; e.currentTarget.style.color = '#25D366'; e.currentTarget.style.background = 'rgba(37,211,102,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
                aria-label="WhatsApp"
              >
                <FaWhatsapp size={16} />
              </a>
              <a
                href="tel:+212611460900"
                className="flex h-10 w-10 items-center justify-center rounded border no-underline transition-all duration-200"
                style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.color = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
                aria-label="Téléphone"
              >
                <FiPhone size={15} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-5 font-condensed text-[11px] font-bold uppercase tracking-[2.5px] text-gold">Navigation</h3>
            <ul className="flex flex-col gap-3 list-none" role="list">
              {FOOTER_NAV.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNav(item.id)}
                    className="bg-transparent p-0 text-[13px] font-light cursor-pointer transition-colors duration-200"
                    style={{ color: 'rgba(255,255,255,0.32)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.32)' }}
                  >
                    → {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-5 font-condensed text-[11px] font-bold uppercase tracking-[2.5px] text-gold">Catégories</h3>
            <ul className="flex flex-col gap-3 list-none" role="list">
              {FOOTER_CATS.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => handleNav('cars')}
                    className="bg-transparent p-0 text-[13px] font-light cursor-pointer transition-colors duration-200"
                    style={{ color: 'rgba(255,255,255,0.32)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.32)' }}
                  >
                    → Location {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div itemScope itemType="https://schema.org/LocalBusiness">
            <meta itemProp="name" content="HM Houti Cars" />
            <h3 className="mb-5 font-condensed text-[11px] font-bold uppercase tracking-[2.5px] text-gold">Contact</h3>
            <ul className="flex flex-col gap-3.5 list-none">
              <li>
                <a
                  href="tel:+212611460900"
                  className="flex items-center gap-2.5 text-[13px] font-light no-underline transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.38)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}
                  itemProp="telephone"
                >
                  <FiPhone size={12} className="shrink-0 opacity-60" />
                  +212 611 460 900
                </a>
              </li>
              <li>
                <a
                  href="mailto:Houtimarouan@gmail.com"
                  className="flex items-center gap-2.5 text-[13px] font-light no-underline transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.38)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#C9A84C' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}
                  itemProp="email"
                >
                  <FiMail size={12} className="shrink-0 opacity-60" />
                  Houtimarouan@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-[13px] font-light" style={{ color: 'rgba(255,255,255,0.38)' }}>
                <FiMapPin size={12} className="shrink-0 opacity-60 mt-0.5" />
                <span itemProp="address">Mont-Aroui, Nador, Maroc</span>
              </li>
              <li className="text-[12px] font-medium text-gold/50">
                Oujda • Nador • Berkane
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-[11px] font-light text-white/18">
            © {year} HM Houti Cars. Tous droits réservés. Location voiture luxe Oujda, Nador, Berkane.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-light text-white/18">
              Oujda · Nador · Berkane · Oriental
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
