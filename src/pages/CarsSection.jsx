import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FleetSlider from '../components/FleetSlider'
import { CarCardSkeleton } from '../components/ui/Skeleton'
import { useCars } from '../context/CarsContext'
import { CAR_CATEGORIES } from '../data'

export default function CarsSection() {
  const { cars, loading } = useCars()
  const [filter, setFilter] = useState('Tous')

  const filtered = useMemo(
    () => (filter === 'Tous' ? cars : cars.filter((c) => c.cat === filter)),
    [cars, filter],
  )

  // Available category tabs (only show categories that have cars)
  const activeCats = useMemo(() => {
    const present = new Set(cars.map((c) => c.cat))
    return CAR_CATEGORIES.filter((cat) => cat === 'Tous' || present.has(cat))
  }, [cars])

  return (
    <section
      id="cars"
      className="luxury-section-line py-28 px-4 sm:px-10 relative overflow-hidden"
      style={{ background: '#0D1A2A' }}
    >
      {/* Decorative watermark */}
      <div
        className="absolute top-10 right-[-20px] font-condensed font-black leading-none pointer-events-none select-none"
        style={{
          fontSize: 'clamp(5rem,15vw,13rem)',
          letterSpacing: '-5px',
          color: 'rgba(201,168,76,0.025)',
        }}
      >
        FLEET
      </div>

      <div className="max-w-[1100px] mx-auto">
        {/* ── Section Header ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14 relative z-10"
        >
          <div className="mb-5 flex items-center gap-3 font-condensed text-[11px] font-bold uppercase tracking-[3px] text-gold">
            <span className="block h-px w-6 bg-gold" />
            Notre Flotte 2026
          </div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2
              className="font-display font-bold leading-[0.95] text-white"
              style={{ fontSize: 'clamp(2.8rem, 5vw, 5rem)' }}
            >
              Choisissez<br />
              Votre <em className="text-gold">Véhicule</em>
            </h2>
            <p className="max-w-[360px] text-sm font-light leading-[1.8]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Des voitures récentes, impeccablement entretenues et assurées. Disponibles immédiatement dans toute la région orientale.
            </p>
          </div>
        </motion.div>

        {/* ── Category Filter Tabs ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative z-10 flex gap-2 mb-10 flex-wrap"
        >
          <span className="mr-2 self-center text-[11px] font-bold uppercase tracking-[2px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Filtrer:
          </span>
          {activeCats.map((cat) => (
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
        </motion.div>

        {/* ── Fleet Slider ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative z-10"
        >
          {loading ? (
            /* Skeleton while loading */
            <div className="grid grid-cols-1 gap-6">
              <CarCardSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-[14px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Aucun véhicule dans cette catégorie.
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={filter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <FleetSlider cars={filtered} />
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>

        {/* ── Bottom Tip ───────────────────────────────── */}
        {!loading && filtered.length > 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center text-[11px] font-medium tracking-[1.5px] uppercase"
            style={{ color: 'rgba(255,255,255,0.18)' }}
          >
            ← Balayez ou utilisez les flèches pour naviguer →
          </motion.p>
        )}
      </div>
    </section>
  )
}
