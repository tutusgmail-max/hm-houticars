import React from 'react'
import { motion } from 'framer-motion'
import { REVIEWS } from '../data'

function Stars({ n }) {
  return (
    <div className="text-sm mb-3" style={{ color: '#C9A84C' }}>
      {'★'.repeat(n)}
      <span style={{ color: '#8A95A5' }}>{'★'.repeat(5 - n)}</span>
    </div>
  )
}

export default function ReviewsSection() {
  return (
    <section id="reviews" className="luxury-section-line relative overflow-hidden bg-[#080E18] px-4 py-28 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-14">
          <div className="mb-5 flex items-center gap-3 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold before:block before:h-px before:w-6 before:bg-gold">
            Témoignages
          </div>
          <h2 className="font-display text-[clamp(2.4rem,4vw,4.5rem)] font-bold leading-[0.95] text-white">
            Ce Que Disent<br /><em className="text-gold">Nos Clients</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((review, i) => (
            <motion.div
              key={`${review.name}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative border border-white/[0.04] bg-[#0D1A2A]/50 p-8 transition hover:border-gold/15 hover:bg-gold/[0.03]"
            >
              <div className="absolute right-8 top-6 font-display text-[5rem] font-bold leading-none text-gold/[0.06]">"</div>
              <Stars n={review.stars} />
              <p className="font-display mb-7 text-[1.15rem] italic leading-[1.7] text-white/65">"{review.text}"</p>
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gradient-to-br from-gold/15 to-gold/[0.05] font-condensed text-sm font-bold text-gold">
                  {review.name.split(' ').map((w) => w[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{review.name}</div>
                  <div className="mt-0.5 text-[11px] text-white/30">{review.city}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
