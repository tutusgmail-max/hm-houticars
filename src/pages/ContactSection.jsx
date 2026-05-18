import React from 'react'
import { motion } from 'framer-motion'
import { CONTACT_INFO } from '../data'
import { useApp } from '../context/AppContext'

const RESERVATION_STEPS = [
  {
    num: '01',
    icon: '✦',
    title: 'Choisissez Votre Véhicule',
    desc: 'Explorez notre flotte premium et sélectionnez le modèle parfaitement adapté à votre déplacement.',
  },
  {
    num: '02',
    icon: '◈',
    title: 'Confirmez sur WhatsApp',
    desc: 'Notre équipe valide disponibilité, horaires, lieu de livraison et conditions en quelques minutes.',
  },
  {
    num: '03',
    icon: '◆',
    title: 'Recevez les Clés',
    desc: 'Votre voiture vous attend à Mont-Aroui, Nador, Oujda, Berkane ou à l’adresse convenue.',
  },
]

export default function ContactSection() {
  const { scrollTo } = useApp()

  return (
    <section id="contact" className="luxury-section-line relative overflow-hidden bg-[#070D16] px-4 py-28 sm:px-10">
      <div className="absolute inset-0 opacity-40" style={{ background: 'linear-gradient(105deg, rgba(7,13,22,0.98) 0%, rgba(7,13,22,0.82) 45%, rgba(7,13,22,0.35) 100%), url("https://ertdqfavrkomikszagtc.supabase.co/storage/v1/object/public/image/lamamamama.png") center / cover' }} />
      <div className="absolute -right-24 top-16 h-[520px] w-[520px] rounded-full bg-gold/[0.08] blur-3xl" />
      <div className="absolute -left-28 bottom-0 h-[420px] w-[420px] rounded-full bg-[#1E3353]/50 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.8) 1px,transparent 1px)', backgroundSize: '96px 96px' }} />

      <div className="relative z-10 mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <div className="mb-5 flex items-center gap-3 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold before:block before:h-px before:w-6 before:bg-gold">
            Conciergerie Privée
          </div>
          <h2 className="font-display mb-7 text-[clamp(2.6rem,5vw,5.4rem)] font-bold leading-[0.88] tracking-[-0.04em] text-white">
            Une Location<br /><em className="text-gold">Sans Effort</em>
          </h2>
          <p className="mb-10 max-w-md text-[15px] font-light leading-[1.9] text-white/45">
            Contactez HM Houti Cars pour une expérience automobile fluide, élégante et parfaitement orchestrée entre Nador, Oujda et Berkane.
          </p>

          <div className="mb-10 overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.035] shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            {CONTACT_INFO.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group flex items-center gap-5 border-b border-white/[0.06] p-5 last:border-b-0 sm:p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/20 bg-gold/[0.08] text-lg shadow-[0_0_35px_rgba(201,168,76,0.08)] transition group-hover:bg-gold/[0.13]">
                  {item.icon}
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-[2.8px] text-white/25">{item.label}</div>
                  <div className="text-sm font-light tracking-[0.2px] text-white/70">{item.val}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <a href="https://wa.me/212611460900" target="_blank" rel="noreferrer" className="btn-gold px-9 py-4 text-[13px] no-underline">
              Réserver sur WhatsApp →
            </a>
            <button onClick={() => scrollTo('cars')} className="btn-ghost px-9 py-4 text-[13px]">
              Voir la Flotte
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }} className="relative">
          <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-gold/[0.12] via-white/[0.03] to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-[34px] border border-white/[0.08] bg-[#0D1A2A]/55 p-5 shadow-[0_35px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-gold/[0.10] blur-3xl" />
            <div className="mb-7 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-6">
              <div>
                <div className="mb-2 font-condensed text-[10px] font-bold uppercase tracking-[3px] text-gold">Process Signature</div>
                <h3 className="font-display text-[clamp(2rem,3vw,3rem)] font-bold leading-none text-white">
                  Réservation<br /><em className="text-gold">en 3 étapes</em>
                </h3>
              </div>
              <div className="hidden h-16 w-16 items-center justify-center rounded-full border border-gold/20 bg-gold/[0.08] font-display text-3xl text-gold sm:flex">
                3
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {RESERVATION_STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: 0.25 + i * 0.12 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="group relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-gold/25 hover:bg-gold/[0.055] sm:p-6"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/[0.07] blur-2xl transition group-hover:bg-gold/[0.12]" />
                  <div className="relative flex gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.16] to-white/[0.03] text-xl text-gold">
                      {step.icon}
                    </div>
                    <div>
                      <div className="mb-1 font-display text-4xl font-light leading-none text-gold/20">{step.num}</div>
                      <h4 className="mb-2 font-condensed text-[1.15rem] font-extrabold uppercase tracking-[1px] text-white">{step.title}</h4>
                      <p className="text-[13px] font-light leading-[1.8] text-white/42">{step.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
