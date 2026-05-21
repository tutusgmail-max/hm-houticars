import React from 'react'
import { motion } from 'framer-motion'
import { WHY_ITEMS } from '../data'

export default function WhySection() {
  return (
    <section id="why" className="luxury-section-line relative overflow-hidden px-4 py-28 sm:px-10" style={{ background: '#080E18' }}>
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 60% at 100% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)' }} />

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-20 lg:grid-cols-2">
        {/* Image col */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
          className="relative hidden lg:block"
        >
          <div className="relative overflow-hidden" style={{ borderRadius: 24, border: '1px solid rgba(201,168,76,0.12)', aspectRatio: '4/3' }}>
            <img
              src="https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/interface%20houticars.png"
              alt="HM Houti Cars Service"
              className="h-full w-full object-cover"
              style={{ filter: 'brightness(0.7) saturate(0.8)' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, transparent 60%)' }} />
          </div>
          {/* Floating stat card */}
          <div className="absolute -bottom-6 -right-6 px-7 py-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C76A)', boxShadow: '0 20px 60px rgba(201,168,76,0.4)' }}>
            <span className="block font-condensed font-black leading-none" style={{ fontSize: '2.8rem', color: '#080E18' }}>500+</span>
            <span className="block text-[10px] font-bold uppercase tracking-[2px] mt-1" style={{ color: 'rgba(8,14,24,0.55)', fontFamily: 'Outfit, sans-serif' }}>Clients Ravis</span>
          </div>
        </motion.div>

        {/* Content col */}
        <div>
          <span className="section-label mb-5 block w-fit">Pourquoi Nous Choisir</span>
          <h2 className="section-title mb-10">
            Une Expérience<br /><em className="text-yellow-300 not-italic">Au-Delà</em><br />de la Location
          </h2>
          <div className="flex flex-col gap-3">
            {WHY_ITEMS.slice(0, 4).map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.09, ease: [0.16,1,0.3,1] }}
                className="relative flex gap-5 overflow-hidden p-5 rounded-2xl cursor-default"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', transition: 'all 0.25s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'; e.currentTarget.style.background = 'rgba(201,168,76,0.03)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="mb-1.5 font-bold text-[15px] text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{item.title}</h3>
                  <p className="text-[13px] font-light leading-[1.75]" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
