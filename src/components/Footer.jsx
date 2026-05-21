import React from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { FiPhone } from 'react-icons/fi'
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

  return (
    <footer className="luxury-section-line relative px-4 pb-10 pt-20 sm:px-10" style={{ background: '#050A11' }}>
      {/* Subtle top glow */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)' }} />

      <div className="mx-auto max-w-[1400px]">
        <div className="mb-14 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-16">

          {/* Brand */}
          <div>
            <button onClick={() => handleNav('home')} className="mb-5 block bg-transparent p-0 text-left cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C76A)', color: '#080E18', fontFamily: 'Outfit, sans-serif' }}>HM</div>
                <span className="font-bold text-[18px] text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Houti Cars</span>
              </div>
            </button>
            <p className="max-w-[260px] text-[13px] font-light leading-[1.85]" style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'Outfit, sans-serif' }}>
              Location automobile de prestige dans la région orientale du Maroc. Excellence, confiance, et service irréprochable.
            </p>
            <div className="flex gap-3 mt-6">
              {[
                { href: 'https://wa.me/212611460900', icon: <FaWhatsapp />, target: '_blank' },
                { href: 'tel:+212611460900', icon: <FiPhone /> },
              ].map(({ href, icon, target }, i) => (
                <a key={i} href={href} target={target} rel={target ? 'noreferrer' : undefined} className="flex h-10 w-10 items-center justify-center rounded-xl no-underline transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.color = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-5 text-[10px] font-bold uppercase tracking-[2.5px]" style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}>Navigation</h4>
            <ul className="flex flex-col gap-3 list-none">
              {FOOTER_NAV.map((item) => (
                <li key={item.id}>
                  <button onClick={() => handleNav(item.id)} className="bg-transparent p-0 text-[13px] font-light cursor-pointer transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'Outfit, sans-serif', border: 'none' }}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="mb-5 text-[10px] font-bold uppercase tracking-[2.5px]" style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}>Catégories</h4>
            <ul className="flex flex-col gap-3 list-none">
              {FOOTER_CATS.map((cat) => (
                <li key={cat}>
                  <button onClick={() => handleNav('cars')} className="bg-transparent p-0 text-[13px] font-light cursor-pointer transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'Outfit, sans-serif', border: 'none' }}>
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-5 text-[10px] font-bold uppercase tracking-[2.5px]" style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}>Contact</h4>
            <ul className="flex flex-col gap-3.5 list-none">
              {['📞 +212 611 460 900', '✉️ Houtimarouan@gmail.com', '📍 Mont-Aroui, Nador', '🗺️ Oujda • Nador • Berkane'].map((item) => (
                <li key={item} className="text-[13px] font-light" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'Outfit, sans-serif' }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-[12px] font-light" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'Outfit, sans-serif' }}>
            © {new Date().getFullYear()} HM Houti Cars — Tous droits réservés
          </p>
          <p className="text-[12px] font-light" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'Outfit, sans-serif' }}>
            Oujda · Nador · Berkane
          </p>
        </div>
      </div>
    </footer>
  )
}
