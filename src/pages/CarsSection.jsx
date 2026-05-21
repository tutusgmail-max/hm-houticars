import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import CarCard from '../components/CarCard'
import { CAR_CATEGORIES } from '../data'
import { useCars } from '../context/CarsContext'
import { CarCardSkeleton } from '../components/ui/Skeleton'

export default function CarsSection() {
  const { cars, loading } = useCars()
  const [filter, setFilter] = useState('Tous')

  const filtered = useMemo(
    () => (filter === 'Tous' ? cars : cars.filter((c) => c.cat === filter)),
    [cars, filter],
  )

  return (
    <section id="cars" className="luxury-section-line py-28 px-4 sm:px-10 relative overflow-hidden" style={{ background: '#0D1A2A' }}>
      {/* Background watermark */}
      <div className="absolute top-10 right-[-30px] pointer-events-none select-none" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(5rem,16vw,13rem)', fontWeight: 900, color: 'rgba(201,168,76,0.025)', letterSpacing: '-5px', lineHeight: 1 }}>FLEET</div>
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.03) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="section-label mb-4 block w-fit">Notre Flotte 2026</span>
            <h2 className="section-title">
              Choisissez<br />Votre <em className="text-yellow-300 not-italic">Véhicule</em>
            </h2>
          </div>
          <p className="max-w-[340px] text-[14px] font-light leading-[1.85]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Des voitures récentes, impeccablement entretenues et assurées. Disponibles immédiatement dans toute la région orientale.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-10 flex-wrap">
          <span className="self-center text-[10px] font-bold uppercase tracking-[2.5px] mr-2" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit, sans-serif' }}>Filtrer:</span>
          {CAR_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-5 py-2 rounded-full text-[12px] font-semibold uppercase tracking-[1.5px] cursor-pointer border transition-all duration-200"
              style={
                filter === cat
                  ? { background: '#C9A84C', color: '#080E18', border: '1px solid #C9A84C', fontFamily: 'Outfit, sans-serif' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Outfit, sans-serif' }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cards scroll */}
        <motion.div
          layout
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading
            ? [1,2,3,4,5].map((i) => <CarCardSkeleton key={i} />)
            : filtered.map((car, i) => (
                <motion.div
                  key={car.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: i * 0.06, ease: [0.16,1,0.3,1] }}
                  className="min-w-[86%] snap-start sm:min-w-[420px] lg:min-w-[440px] xl:min-w-[450px]"
                >
                  <CarCard car={car} delay={i} />
                </motion.div>
              ))}
        </motion.div>

        {/* Scroll dots */}
        {!loading && filtered.length > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {filtered.map((car) => (
              <span key={car.id} className="h-1 w-8 rounded-full" style={{ background: 'rgba(201,168,76,0.2)' }} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
