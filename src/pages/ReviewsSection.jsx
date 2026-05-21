import React from 'react'
import { motion } from 'framer-motion'
import { REVIEWS } from '../data'

function Stars({ n }) {
  return (
    <div className="flex gap-0.5 mb-4">
      {[...Array(5)].map((_, i) => (
        <span key={i} style={{ color: i < n ? '#C9A84C' : 'rgba(255,255,255,0.12)', fontSize: 14 }}>★</span>
      ))}
    </div>
  )
}

export default function ReviewsSection() {
  return (
    <section id="reviews" className="luxury-section-line relative overflow-hidden px-4 py-28 sm:px-10" style={{ background: '#080E18' }}>
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(201,168,76,0.04) 0%, transparent 70%)' }} />

      <div className="mx-auto max-w-[1400px] relative">
        <div className="mb-14 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <span className="section-label mb-4 block w-fit">Témoignages</span>
            <h2 className="section-title">Ce Que Disent<br /><em className="text-yellow-300 not-italic">Nos Clients</em></h2>
          </div>
          <div className="flex items-center gap-6">
            {[['4.9/5', 'Note moyenne'], ['500+', 'Avis clients'], ['98%', 'Satisfaction']].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="font-condensed font-bold" style={{ fontSize: '2rem', color: '#C9A84C' }}>{val}</div>
                <div className="text-[11px] font-medium uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((review, i) => (
            <motion.div
              key={`${review.name}-${i}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16,1,0.3,1] }}
              className="relative p-8 rounded-2xl group"
              style={{ background: 'rgba(13,26,42,0.55)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', transition: 'all 0.25s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'; e.currentTarget.style.background = 'rgba(13,26,42,0.75)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(13,26,42,0.55)' }}
            >
              {/* Quote mark */}
              <div className="absolute right-7 top-5 font-display font-bold leading-none select-none" style={{ fontSize: '5rem', color: 'rgba(201,168,76,0.06)' }}>"</div>
              <Stars n={review.stars} />
              <p className="font-display mb-7 text-[1.1rem] italic leading-[1.75]" style={{ color: 'rgba(255,255,255,0.65)' }}>"{review.text}"</p>
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}>
                  {review.name.split(' ').map((w) => w[0]).join('')}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{review.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>{review.city}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
