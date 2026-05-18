import React from 'react'
import { motion } from 'framer-motion'
import { PROCESS_STEPS } from '../data'

export default function ProcessSection() {
  return (
    <section id="process" className="luxury-section-line relative bg-[#0D1A2A] px-4 py-24 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-16 text-center">
          <div className="mb-4 flex items-center justify-center gap-3 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold before:block before:h-px before:w-6 before:bg-gold">
            Comment Ça Marche
          </div>
          <h2 className="font-display text-[clamp(2.4rem,4vw,4rem)] font-bold leading-none text-white">
            4 Étapes Vers<br /><em className="text-gold">l'Excellence</em>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm font-light leading-[1.8] text-white/35">
            De la sélection à la remise des clés, tout est pensé pour votre confort.
          </p>
        </div>

        <div className="grid grid-cols-1 border border-white/[0.04] bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative bg-[#0D1A2A] p-8 transition hover:bg-gold/[0.04] sm:p-10"
            >
              <div className="font-display mb-5 text-[5rem] font-light leading-none tracking-[-3px] text-gold/10">
                {step.num}
              </div>
              <div className="mb-3 text-3xl">{['🔍', '📅', '🚗', '✨'][i] || '✦'}</div>
              <div className="mb-2 font-condensed text-[1.3rem] font-extrabold tracking-wide text-white">{step.title}</div>
              <div className="text-[13px] font-light leading-[1.7] text-white/35">{step.desc}</div>
              {i < PROCESS_STEPS.length - 1 && <div className="absolute right-[-1px] top-1/2 hidden h-px w-6 -translate-y-1/2 bg-gold/20 lg:block" />}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
