import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import CarCard from '../components/CarCard'
import { CAR_CATEGORIES } from '../data'
import { useCars } from '../context/CarsContext'
import { CarCardSkeleton } from '../components/ui/Skeleton'

function ScrollArrow({ direction, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Véhicule précédent' : 'Véhicule suivant'}
      className="hidden md:flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 z-20"
      style={{
        width: 48,
        height: 48,
        background: 'rgba(13,26,42,0.9)',
        border: '1px solid rgba(201,168,76,0.25)',
        color: '#C9A84C',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {direction === 'left' ? <FiChevronLeft size={22} /> : <FiChevronRight size={22} />}
    </button>
  )
}

export default function CarsSection() {
  const { cars, loading } = useCars()
  const [filter, setFilter] = useState('Tous')
  const [activeIdx, setActiveIdx] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const scrollRef = useRef(null)

  const filtered = useMemo(
    () => (filter === 'Tous' ? cars : cars.filter((c) => c.cat === filter)),
    [cars, filter],
  )

  const canScroll = filtered.length > 1

  const updateScrollEdges = useCallback((root) => {
    if (!root) return
    const { scrollLeft, scrollWidth, clientWidth } = root
    setAtStart(scrollLeft <= 8)
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 8)
  }, [])

  const scrollToIndex = useCallback((index) => {
    const root = scrollRef.current
    if (!root || !filtered.length) return
    const idx = Math.max(0, Math.min(index, filtered.length - 1))
    const child = root.children[idx]
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
      setActiveIdx(idx)
    }
  }, [filtered.length])

  const scrollByDelta = useCallback((dir) => {
    const root = scrollRef.current
    if (!root) return
    const first = root.children[0]
    const step = (first?.offsetWidth || 440) + 16
    root.scrollBy({ left: dir * step, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    setActiveIdx(0)
    setAtStart(true)
    setAtEnd(false)
    const root = scrollRef.current
    if (root) {
      root.scrollTo({ left: 0, behavior: 'auto' })
      requestAnimationFrame(() => updateScrollEdges(root))
    }
  }, [filter, filtered.length, loading, updateScrollEdges])

  useEffect(() => {
    const root = scrollRef.current
    if (!root || loading) return

    const onScroll = () => {
      const { scrollLeft, children } = root
      if (!children.length) return
      let closest = 0
      let minDist = Infinity
      Array.from(children).forEach((child, i) => {
        const dist = Math.abs(child.offsetLeft - scrollLeft)
        if (dist < minDist) {
          minDist = dist
          closest = i
        }
      })
      setActiveIdx(closest)
      updateScrollEdges(root)
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [filtered, loading, updateScrollEdges])

  const onWheel = useCallback((e) => {
    const root = scrollRef.current
    if (!root || !canScroll) return
    if (root.scrollWidth <= root.clientWidth + 2) return
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
    root.scrollLeft += e.deltaY
    e.preventDefault()
  }, [canScroll])

  const onKeyDown = useCallback((e) => {
    if (!canScroll) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      scrollByDelta(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      scrollByDelta(1)
    }
  }, [canScroll, scrollByDelta])

  return (
    <section id="cars" className="luxury-section-line py-28 px-4 sm:px-10 relative overflow-hidden" style={{ background: '#0D1A2A' }}>
      <div className="absolute top-10 right-[-30px] pointer-events-none select-none" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(5rem,16vw,13rem)', fontWeight: 900, color: 'rgba(201,168,76,0.025)', letterSpacing: '-5px', lineHeight: 1 }}>FLEET</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.03) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="max-w-[1400px] mx-auto relative z-10">
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

        <div className="flex gap-2 mb-10 flex-wrap">
          <span className="self-center text-[10px] font-bold uppercase tracking-[2.5px] mr-2" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit, sans-serif' }}>Filtrer:</span>
          {CAR_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
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

        <div className="relative flex items-center gap-3 md:gap-4">
          <ScrollArrow direction="left" onClick={() => scrollByDelta(-1)} disabled={!canScroll || atStart} />

          <div
            ref={scrollRef}
            role="region"
            aria-label="Liste des véhicules"
            tabIndex={canScroll ? 0 : -1}
            onWheel={onWheel}
            onKeyDown={onKeyDown}
            className="flex flex-1 min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
          >
            {loading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="min-w-[86%] snap-start sm:min-w-[420px] lg:min-w-[440px] xl:min-w-[450px] shrink-0">
                    <CarCardSkeleton />
                  </div>
                ))
              : filtered.map((car, i) => (
                  <motion.div
                    key={car.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    className="min-w-[86%] snap-start sm:min-w-[420px] lg:min-w-[440px] xl:min-w-[450px] shrink-0"
                  >
                    <CarCard car={car} delay={i} />
                  </motion.div>
                ))}
          </div>

          <ScrollArrow
            direction="right"
            onClick={() => scrollByDelta(1)}
            disabled={!canScroll || atEnd}
          />
        </div>

        {!loading && canScroll && (
          <div className="mt-4 flex justify-center gap-2">
            {filtered.map((car, i) => (
              <button
                key={car.id}
                type="button"
                aria-label={`Voir ${car.name}`}
                onClick={() => scrollToIndex(i)}
                className="h-1 rounded-full transition-all duration-300 cursor-pointer border-none p-0"
                style={{
                  width: i === activeIdx ? 32 : 24,
                  background: i === activeIdx ? '#C9A84C' : 'rgba(201,168,76,0.2)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
