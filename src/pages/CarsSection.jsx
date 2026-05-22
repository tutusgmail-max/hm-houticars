import React, { useMemo, useState, useRef, useCallback, useEffect, memo } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import CarCard from '../components/CarCard'
import { CAR_CATEGORIES } from '../data'
import { useCars } from '../context/CarsContext'
import { CarCardSkeleton } from '../components/ui/Skeleton'

const SLIDE_CLASS =
  'fleet-slide shrink-0 snap-center scroll-ml-[7vw] scroll-mr-[7vw] w-[min(82vw,360px)] sm:w-[min(76vw,400px)] md:w-[min(68%,420px)] lg:w-[400px] xl:w-[420px]'

const TRACK_CLASS = [
  'fleet-track flex flex-1 min-w-0 gap-3 sm:gap-4 overflow-x-auto pb-6',
  'snap-x snap-proximity md:snap-proximity',
  'overscroll-x-contain touch-pan-x',
  '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  'md:scroll-px-[14%] md:px-[6%]',
].join(' ')

const ScrollArrow = memo(function ScrollArrow({ direction, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Véhicule précédent' : 'Véhicule suivant'}
      className="hidden md:flex items-center justify-center rounded-full transition-[transform,opacity] duration-200 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 z-20 hover:scale-105 active:scale-95"
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
})

const FleetSlide = memo(function FleetSlide({ car }) {
  return (
    <div data-fleet-slide className={SLIDE_CLASS} style={{ contain: 'layout style paint' }}>
      <CarCard car={car} inCarousel />
    </div>
  )
})

const FleetDot = memo(function FleetDot({ active, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-1 rounded-full transition-[width,background-color] duration-300 cursor-pointer border-none p-0"
      style={{
        width: active ? 32 : 24,
        background: active ? '#C9A84C' : 'rgba(201,168,76,0.2)',
      }}
    />
  )
})

function EdgeFade({ side, visible }) {
  if (!visible) return null
  const isLeft = side === 'left'
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-0 bottom-6 z-10 hidden md:block w-[min(18%,140px)]"
      style={{
        [isLeft ? 'left' : 'right']: 48,
        background: isLeft
          ? 'linear-gradient(90deg, #0D1A2A 0%, rgba(13,26,42,0.85) 35%, transparent 100%)'
          : 'linear-gradient(270deg, #0D1A2A 0%, rgba(13,26,42,0.85) 35%, transparent 100%)',
      }}
    />
  )
}

export default function CarsSection() {
  const { cars, loading } = useCars()
  const [filter, setFilter] = useState('Tous')
  const [activeIdx, setActiveIdx] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const scrollRef = useRef(null)
  const activeIdxRef = useRef(0)
  const edgesRef = useRef({ start: true, end: false })
  const scrollRafRef = useRef(null)

  const filtered = useMemo(
    () => (filter === 'Tous' ? cars : cars.filter((c) => c.cat === filter)),
    [cars, filter],
  )

  const canScroll = filtered.length > 1

  const syncEdges = useCallback((root) => {
    if (!root) return
    const { scrollLeft, scrollWidth, clientWidth } = root
    const start = scrollLeft <= 8
    const end = scrollLeft + clientWidth >= scrollWidth - 8
    if (edgesRef.current.start !== start) {
      edgesRef.current.start = start
      setAtStart(start)
    }
    if (edgesRef.current.end !== end) {
      edgesRef.current.end = end
      setAtEnd(end)
    }
  }, [])

  const scrollToIndex = useCallback((index) => {
    const root = scrollRef.current
    if (!root || !filtered.length) return
    const idx = Math.max(0, Math.min(index, filtered.length - 1))
    const slide = root.querySelectorAll('[data-fleet-slide]')[idx]
    if (slide) {
      slide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      activeIdxRef.current = idx
      setActiveIdx(idx)
    }
  }, [filtered.length])

  const scrollByDelta = useCallback((dir) => {
    const root = scrollRef.current
    if (!root) return
    const slides = root.querySelectorAll('[data-fleet-slide]')
    if (!slides.length) return
    const next = Math.max(0, Math.min(activeIdxRef.current + dir, slides.length - 1))
    slides[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    activeIdxRef.current = next
    setActiveIdx(next)
  }, [])

  useEffect(() => {
    activeIdxRef.current = 0
    edgesRef.current = { start: true, end: false }
    setActiveIdx(0)
    setAtStart(true)
    setAtEnd(false)
    const root = scrollRef.current
    if (root) {
      root.scrollTo({ left: 0, behavior: 'auto' })
      requestAnimationFrame(() => syncEdges(root))
    }
  }, [filter, filtered.length, loading, syncEdges])

  useEffect(() => {
    const root = scrollRef.current
    if (!root || loading || !filtered.length) return

    const measureActive = () => {
      const slides = root.querySelectorAll('[data-fleet-slide]')
      if (!slides.length) return
      const rootRect = root.getBoundingClientRect()
      const center = rootRect.left + rootRect.width * 0.5
      let closest = 0
      let minDist = Infinity
      slides.forEach((el, i) => {
        const r = el.getBoundingClientRect()
        const dist = Math.abs(r.left + r.width * 0.5 - center)
        if (dist < minDist) {
          minDist = dist
          closest = i
        }
      })
      if (closest !== activeIdxRef.current) {
        activeIdxRef.current = closest
        setActiveIdx(closest)
      }
    }

    const onScroll = () => {
      if (scrollRafRef.current != null) return
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null
        syncEdges(root)
        measureActive()
      })
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    syncEdges(root)
    measureActive()

    return () => {
      root.removeEventListener('scroll', onScroll)
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [filtered, loading, syncEdges])

  const onWheel = useCallback((e) => {
    const root = scrollRef.current
    if (!root || !canScroll) return
    if (root.scrollWidth <= root.clientWidth + 2) return
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
    root.scrollLeft += e.deltaY
    e.preventDefault()
  }, [canScroll])

  const onKeyDown = useCallback(
    (e) => {
      if (!canScroll) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        scrollByDelta(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        scrollByDelta(1)
      }
    },
    [canScroll, scrollByDelta],
  )

  return (
    <section id="cars" className="luxury-section-line py-28 px-4 sm:px-10 relative overflow-hidden" style={{ background: '#0D1A2A' }}>
      <style>{`
        .fleet-track {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: auto;
        }
        .fleet-track:focus-visible {
          outline: 2px solid rgba(201, 168, 76, 0.45);
          outline-offset: 4px;
        }
        .fleet-slide {
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `}</style>

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

          <div className="relative flex-1 min-w-0">
            <EdgeFade side="left" visible={canScroll && !atStart} />
            <EdgeFade side="right" visible={canScroll && !atEnd} />

            <div
              ref={scrollRef}
              role="region"
              aria-label="Liste des véhicules"
              aria-roledescription="carousel"
              tabIndex={canScroll ? 0 : -1}
              onWheel={onWheel}
              onKeyDown={onKeyDown}
              className={TRACK_CLASS}
            >
              {loading
                ? [1, 2, 3, 4, 5].map((i) => (
                    <div key={i} data-fleet-slide className={SLIDE_CLASS}>
                      <CarCardSkeleton />
                    </div>
                  ))
                : filtered.map((car) => (
                    <FleetSlide key={car.id} car={car} />
                  ))}
            </div>
          </div>

          <ScrollArrow direction="right" onClick={() => scrollByDelta(1)} disabled={!canScroll || atEnd} />
        </div>

        {!loading && canScroll && (
          <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Navigation flotte">
            {filtered.map((car, i) => (
              <FleetDot
                key={car.id}
                active={i === activeIdx}
                label={`Voir ${car.name}`}
                onClick={() => scrollToIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
