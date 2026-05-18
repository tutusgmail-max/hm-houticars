import React from 'react'
import { motion } from 'framer-motion'
import { WHY_ITEMS } from '../data'

export default function WhySection() {
  return (
    <section id="why" className="luxury-section-line relative overflow-hidden bg-[#080E18] px-4 py-28 sm:px-10">
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-20 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative hidden lg:block">
          <div className="relative aspect-[4/3] overflow-hidden rounded border border-gold/15">
            <img src="https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/interface%20houticars.png" alt="HM Houti Cars Service" className="h-full w-full object-cover brightness-75 saturate-75" />
            <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent" />
          </div>
          <div className="absolute -bottom-5 -right-5 rounded bg-gold px-7 py-6 font-condensed text-[#080E18]">
            <span className="block text-[2.8rem] font-black leading-none tracking-[-2px]">500+</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[2px] opacity-70">Clients Ravis</span>
          </div>
        </motion.div>

        <div>
          <div className="mb-5 flex items-center gap-3 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold before:block before:h-px before:w-6 before:bg-gold">
            Pourquoi Nous Choisir
          </div>
          <h2 className="font-display mb-8 text-[clamp(2.4rem,4vw,4rem)] font-bold leading-none text-white">
            Une Expérience<br /><em className="text-gold">Au-Delà</em><br />de la Location
          </h2>
          <div className="flex flex-col gap-6">
            {WHY_ITEMS.slice(0, 4).map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative flex gap-5 overflow-hidden rounded border border-white/[0.04] bg-white/[0.015] p-6 transition hover:border-gold/15 hover:bg-gold/[0.04]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-gold/15 bg-gold/[0.08] text-lg">{item.icon}</div>
                <div>
                  <h3 className="mb-1.5 font-condensed text-[1.1rem] font-bold tracking-wide text-white">{item.title}</h3>
                  <p className="text-[13px] font-light leading-[1.7] text-white/35">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
