import React from 'react'
import { motion } from 'framer-motion'
import { PROCESS_STEPS } from '../data'

const ICONS = ['🔍', '📅', '🚗', '✨']

export default function ProcessSection() {
  return (
    <section id="process" className="luxury-section-line relative px-4 py-28 sm:px-10" style={{ background: '#0D1A2A' }}>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-16 text-center">
          <div className="mb-4">
            <span className="section-label">Comment Ça Marche</span>
          </div>
          <h2 className="section-title">4 Étapes Vers<br /><em className="text-yellow-300 not-italic">l'Excellence</em></h2>
          <p className="mx-auto mt-5 max-w-md text-[14px] font-light leading-[1.9]" style={{ color: 'rgba(255,255,255,0.32)' }}>
            De la sélection à la remise des clés, tout est pensé pour votre confort.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
          {PROCESS_STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16,1,0.3,1] }}
              className="relative p-8 sm:p-10 group cursor-default"
              style={{ background: '#0D1A2A', transition: 'background 0.25s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.03)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0D1A2A' }}
            >
              {/* Number watermark */}
              <div className="font-display mb-5 leading-none select-none" style={{ fontSize: '5rem', fontWeight: 800, color: 'rgba(201,168,76,0.07)' }}>{step.num}</div>
              {/* Icon */}
              <div className="text-3xl mb-4">{ICONS[i] || '✦'}</div>
              {/* Title */}
              <div className="text-[1.2rem] font-bold mb-2.5 text-white transition-colors" style={{ fontFamily: 'Outfit, sans-serif' }}>{step.title}</div>
              {/* Desc */}
              <div className="text-[13px] font-light leading-[1.75]" style={{ color: 'rgba(255,255,255,0.32)' }}>{step.desc}</div>
              {/* Arrow connector */}
              {i < PROCESS_STEPS.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-8 h-8 rounded-full hidden lg:flex items-center justify-center text-xs" style={{ background: '#0D1A2A', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.5)' }}>→</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
