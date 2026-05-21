import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { REVIEWS } from '../data'

function Stars({ n }) {
  return (
    <div className="flex items-center gap-0.5 mb-3" aria-label={`${n} étoiles sur 5`} role="img">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 12 12" fill={i < n ? '#C9A84C' : 'rgba(138,149,165,0.3)'}>
          <path d="M6 1l1.29 2.61 2.88.42-2.09 2.03.49 2.87L6 7.54 3.43 8.93l.49-2.87L1.83 4.03l2.88-.42z"/>
        </svg>
      ))}
    </div>
  )
}

export default function ReviewsSection() {
  const avgRating = (REVIEWS.reduce((s, r) => s + r.stars, 0) / REVIEWS.length).toFixed(1)

  return (
    <section
      id="reviews"
      className="luxury-section-line relative overflow-hidden bg-[#080E18] px-4 py-28 sm:px-10"
      aria-label="Avis clients HM Houti Cars"
      itemScope
      itemType="https://schema.org/Product"
    >
      {/* Hidden schema data */}
      <meta itemProp="name" content="HM Houti Cars – Location Voiture Oujda" />
      <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
        <meta itemProp="ratingValue" content={avgRating} />
        <meta itemProp="reviewCount" content={String(REVIEWS.length)} />
        <meta itemProp="bestRating" content="5" />
      </div>

      <div className="mx-auto max-w-[1360px]">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-5 flex items-center gap-3 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold before:block before:h-px before:w-6 before:bg-gold">
              Témoignages Vérifiés
            </div>
            <h2 className="font-display text-[clamp(2.2rem,4vw,4rem)] font-bold leading-[0.95] text-white">
              Ce Que Disent<br /><em className="text-gold">Nos Clients</em>
            </h2>
          </div>

          {/* Aggregate rating widget */}
          <div className="flex items-center gap-5 px-6 py-4 rounded" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
            <div className="text-center">
              <div className="font-condensed font-black text-[3rem] leading-none text-gold">{avgRating}</div>
              <Stars n={Math.round(parseFloat(avgRating))} />
              <div className="text-[10px] text-white/30 uppercase tracking-[1.5px] font-bold">{REVIEWS.length} Avis</div>
            </div>
            <div className="w-px h-16 bg-gold/15" />
            <div className="flex flex-col gap-1.5">
              {[5,4,3].map((star) => {
                const count = REVIEWS.filter(r => r.stars === star).length
                const pct = Math.round((count / REVIEWS.length) * 100)
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white/30 w-2">{star}</span>
                    <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#C9A84C' }} />
                    </div>
                    <span className="text-[10px] text-white/25">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {REVIEWS.map((review, i) => (
            <motion.div
              key={`${review.name}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="relative p-8 transition-all duration-300"
              style={{ background: '#080E18' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.03)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#080E18' }}
              itemScope
              itemType="https://schema.org/Review"
            >
              {/* Quote mark */}
              <div className="absolute right-8 top-6 font-display text-[4rem] font-bold leading-none text-gold/[0.06]" aria-hidden="true">"</div>

              <Stars n={review.stars} />
              <meta itemProp="reviewRating" content={String(review.stars)} />

              <p
                className="font-display mb-7 text-[1.1rem] italic leading-[1.75] text-white/60"
                itemProp="reviewBody"
              >
                "{review.text}"
              </p>

              <div className="flex items-center gap-3.5" itemProp="author" itemScope itemType="https://schema.org/Person">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-condensed text-sm font-black text-navy" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C76A)' }}>
                  {review.name.split(' ').map((w) => w[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white" itemProp="name">{review.name}</div>
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
