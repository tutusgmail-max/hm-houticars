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
    <footer className="luxury-section-line relative bg-[#050A11] px-4 pb-10 pt-20 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-14 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-16">

          {/* Brand */}
          <div>
            <button onClick={() => handleNav('home')} className="mb-4 block bg-transparent p-0 text-left font-condensed text-[1.6rem] font-black text-white">
              HM<span className="text-gold">HOUTI</span>CARS
            </button>
            <p className="max-w-[270px] text-[13px] font-light leading-[1.8] text-white/30">
              Location automobile de prestige dans la région orientale du Maroc. Excellence, confiance, et service irréprochable.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="https://wa.me/212611460900" target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded border border-white/[0.08] text-white/30 no-underline transition hover:border-gold/30 hover:bg-gold/[0.06] hover:text-gold">
                <FaWhatsapp />
              </a>
              <a href="tel:+212611460900" className="flex h-10 w-10 items-center justify-center rounded border border-white/[0.08] text-white/30 no-underline transition hover:border-gold/30 hover:bg-gold/[0.06] hover:text-gold">
                <FiPhone />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-5 font-condensed text-[11px] font-bold uppercase tracking-[2.5px] text-gold">Navigation</h4>
            <ul className="flex flex-col gap-3 list-none">
              {FOOTER_NAV.map((item) => (
                <li key={item.id}>
                  <button onClick={() => handleNav(item.id)} className="bg-transparent p-0 text-[13px] font-light text-white/35 transition hover:text-gold">
                    → {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="mb-5 font-condensed text-[11px] font-bold uppercase tracking-[2.5px] text-gold">Catégories</h4>
            <ul className="flex flex-col gap-3 list-none">
              {FOOTER_CATS.map((cat) => (
                <li key={cat}><button onClick={() => handleNav('cars')} className="bg-transparent p-0 text-[13px] font-light text-white/35 transition hover:text-gold">→ {cat}</button></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-5 font-condensed text-[11px] font-bold uppercase tracking-[2.5px] text-gold">Contact</h4>
            <ul className="flex flex-col gap-3 list-none">
              <li><span className="text-[13px] font-light text-white/40">📞 +212 611 460 900</span></li>
              <li><span className="text-[13px] font-light text-white/40">✉️ Houtimarouan@gmail.com</span></li>
              <li><span className="text-[13px] font-light text-white/40">📍 Mont-Aroui, Nador, Morocco</span></li>
              <li><span className="text-[13px] font-light text-white/40">�️ Oujda • Nador • Berkane</span></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-8 sm:flex-row">
          <p className="text-[12px] font-light text-white/20">
            © {new Date().getFullYear()} HM Houti Cars. Tous droits réservés. Location automobile de prestige à Oujda.
          </p>
          <p className="text-[12px] font-light text-white/20">
            Oujda · Nador · Berkane
          </p>
        </div>
      </div>
    </footer>
  )
}
