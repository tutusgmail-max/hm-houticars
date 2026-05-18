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
      <div className="absolute top-14 right-[-20px] font-condensed text-[clamp(5rem,15vw,12rem)] font-black leading-none tracking-[-5px] text-gold/[0.03] pointer-events-none select-none">FLEET</div>
      <div className="max-w-[1360px] mx-auto">
        <div className="mb-14 relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-5 flex items-center gap-3 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold before:block before:h-px before:w-6 before:bg-gold">
              Notre Flotte 2026
            </div>
            <h2 className="font-display font-bold leading-[0.95] text-white" style={{ fontSize: 'clamp(2.8rem, 5vw, 5rem)' }}>
              Choisissez<br />Votre <em className="text-gold">Véhicule</em>
            </h2>
          </div>
          <p className="max-w-[360px] text-sm font-light leading-[1.8] text-white/40">
            Des voitures récentes, impeccablement entretenues et assurées. Disponibles immédiatement dans toute la région orientale.
          </p>
        </div>

        <div className="flex gap-2 mb-10 flex-wrap relative z-10">
          <span className="mr-2 self-center text-[11px] font-bold uppercase tracking-[2px] text-white/20">Filtrer:</span>
          {CAR_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-5 py-2 rounded-full text-[12px] font-condensed font-bold uppercase tracking-[1.5px] cursor-pointer border transition-all duration-200"
              style={
                filter === cat
                  ? { background: '#C9A84C', color: '#080E18', border: '1px solid #C9A84C' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0.5 relative z-10">
          {loading
            ? [1, 2, 3, 4, 5, 6].map((i) => <CarCardSkeleton key={i} />)
            : filtered.map((car, i) => (
                <motion.div
                  key={car.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                >
                  <CarCard car={car} delay={i} />
                </motion.div>
              ))}
        </motion.div>
      </div>
    </section>
  )
}
