import React, { useState, useRef, useCallback, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiChevronLeft, FiChevronRight, FiUsers, FiSettings, FiCheck } from 'react-icons/fi'
import { BsFuelPump } from 'react-icons/bs'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import { getCarDisplayImage } from '../services/cars.service'
import LazyImage from './ui/LazyImage'

/* ─── Spec Pill ─────────────────────────────────────────────────────────────── */
const SpecPill = memo(({ icon, label }) => (
  <span
    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap"
    style={{
      color: 'rgba(255,255,255,0.5)',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <span className="opacity-60 text-[12px]">{icon}</span>
    {label}
  </span>
))

/* ─── Nav Dot ───────────────────────────────────────────────────────────────── */
const NavDot = memo(({ active, onClick }) => (
  <button
    onClick={onClick}
    aria-label="Go to slide"
    className="rounded-full cursor-pointer transition-all duration-300 outline-none"
    style={{
      width: active ? 28 : 8,
      height: 8,
      background: active ? '#C9A84C' : 'rgba(255,255,255,0.15)',
      border: 'none',
      padding: 0,
    }}
  />
))

/* ─── Arrow Button ──────────────────────────────────────────────────────────── */
const ArrowBtn = memo(({ onClick, direction, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={direction === 'left' ? 'Précédent' : 'Suivant'}
    className="flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 outline-none"
    style={{
      width: 52,
      height: 52,
      background: 'rgba(13,26,42,0.8)',
      border: '1px solid rgba(201,168,76,0.2)',
      color: '#C9A84C',
      flexShrink: 0,
      opacity: disabled ? 0.3 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = '#C9A84C'
        e.currentTarget.style.color = '#080E18'
        e.currentTarget.style.borderColor = '#C9A84C'
        e.currentTarget.style.transform = 'scale(1.06)'
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = 'rgba(13,26,42,0.8)'
        e.currentTarget.style.color = '#C9A84C'
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'
        e.currentTarget.style.transform = 'scale(1)'
      }
    }}
  >
    {direction === 'left' ? <FiChevronLeft size={22} /> : <FiChevronRight size={22} />}
  </button>
))

/* ─── Thumbnail ─────────────────────────────────────────────────────────────── */
const Thumb = memo(({ car, active, onClick }) => (
  <button
    onClick={onClick}
    aria-label={`Voir ${car.name}`}
    className="relative rounded-xl overflow-hidden cursor-pointer outline-none transition-all duration-300 flex-shrink-0"
    style={{
      width: 76,
      height: 54,
      background: 'rgba(13,26,42,0.9)',
      border: active ? '1.5px solid #C9A84C' : '1.5px solid rgba(255,255,255,0.07)',
      opacity: active ? 1 : 0.5,
      transform: active ? 'scale(1.07)' : 'scale(1)',
      boxShadow: active ? '0 0 16px rgba(201,168,76,0.25)' : 'none',
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.opacity = '0.8'
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.opacity = '0.5'
    }}
  >
    <img
      src={getCarDisplayImage(car)}
      alt={car.name}
      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}
      loading="lazy"
    />
    {active && (
      <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: '#C9A84C' }} />
    )}
  </button>
))

/* ─── Car Card ──────────────────────────────────────────────────────────────── */
function CarCard({ car, direction }) {
  const { openBooking } = useApp()
  const { user } = useAuth()

  const handleReserve = useCallback(() => {
    if (car.available) openBooking(car, '', '', !!user)
  }, [openBooking, car, user])

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 50 : -50, scale: 0.98 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -50 : 50, scale: 0.98 }),
  }

  return (
    <motion.div
      key={car.id}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full"
    >
      {/* ─── Card Shell ─── */}
      <div
        className="w-full overflow-hidden relative"
        style={{
          background: 'linear-gradient(145deg, rgba(14,28,44,0.95) 0%, rgba(8,14,24,0.98) 100%)',
          border: '1px solid rgba(201,168,76,0.12)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Gold top line */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.6),transparent)' }}
        />

        {/* ─── Desktop: side-by-side | Mobile: stacked ─── */}
        <div className="flex flex-col lg:flex-row">

          {/* Image */}
          <div
            className="relative flex items-center justify-center overflow-hidden flex-shrink-0 lg:w-[420px] lg:rounded-l-[20px] lg:rounded-tr-none"
            style={{
              background: 'linear-gradient(135deg,#0c1826,#080e18)',
              height: 300,
              borderRadius: '20px 20px 0 0',
            }}
          >
            {/* LG: left panel */}
            
            <div
              className="relative flex items-center justify-center w-full lg:w-[420px] lg:h-[360px]"
              style={{ height: 300 }}
            >
              {/* Ambient glow */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 65%, rgba(201,168,76,0.06) 0%, transparent 70%)' }} />

              {/* Top badges row */}
              <div className="absolute top-5 inset-x-5 flex justify-between items-start z-10">
                {car.cat && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-[2.5px] px-3 py-1.5"
                    style={{ background: 'rgba(201,168,76,0.13)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.22)', borderRadius: 6 }}
                  >
                    {car.cat}
                  </span>
                )}
                {car.badge && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-[2px] px-3 py-1.5"
                    style={{ background: '#C9A84C', color: '#080E18', borderRadius: 6 }}
                  >
                    {car.badge}
                  </span>
                )}
              </div>

              {/* Year */}
              {car.year && (
                <span
                  className="absolute bottom-4 right-5 z-10 font-mono text-[11px] font-bold tracking-[3px]"
                  style={{ color: 'rgba(255,255,255,0.22)' }}
                >
                  {car.year}
                </span>
              )}

              {/* Unavailable overlay */}
              {!car.available && (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm"
                  style={{ background: 'rgba(8,14,24,0.78)' }}
                >
                  <span
                    className="text-[13px] font-bold uppercase tracking-[3px] text-red-400 border border-red-400/30 px-6 py-2"
                    style={{ borderRadius: 8 }}
                  >
                    Indisponible
                  </span>
                </div>
              )}

              <LazyImage
                src={getCarDisplayImage(car)}
                alt={car.name}
                className="object-contain"
                style={{
                  width: '100%',
                  height: 240,
                  padding: '16px 28px',
                  filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.7))',
                }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col p-8 lg:p-10 min-w-0">

            {/* Brand label */}
            <div
              className="mb-1 text-[10px] font-bold uppercase tracking-[3px]"
              style={{ color: 'rgba(201,168,76,0.75)' }}
            >
              {car.name?.split(' ')[0]}
            </div>

            {/* Model name */}
            <h3
              className="leading-none mb-5 font-black"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 'clamp(2rem,4vw,3.4rem)',
                color: '#FFFFFF',
                letterSpacing: '-0.5px',
              }}
            >
              {car.name?.split(' ').slice(1).join(' ') || car.name}
            </h3>

            {/* Specs row */}
            <div className="flex flex-wrap gap-2 mb-5">
              {car.seats && <SpecPill icon={<FiUsers />} label={`${car.seats} places`} />}
              {car.fuel && <SpecPill icon={<BsFuelPump />} label={car.fuel} />}
              {car.trans && <SpecPill icon={<FiSettings />} label={car.trans} />}
            </div>

            {/* Features */}
            {car.specs?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {car.specs.map((s, si) => (
                  <span
                    key={`${car.id}-spec-${si}`}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(201,168,76,0.06)',
                      color: 'rgba(201,168,76,0.85)',
                      border: '1px solid rgba(201,168,76,0.15)',
                    }}
                  >
                    <FiCheck size={10} style={{ color: '#C9A84C', flexShrink: 0 }} />
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Price + CTA */}
            <div
              className="mt-auto pt-6 flex items-center justify-between flex-wrap gap-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <div
                  className="text-[10px] font-bold uppercase tracking-[2px] mb-1"
                  style={{ color: 'rgba(255,255,255,0.28)' }}
                >
                  À partir de
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="font-black leading-none"
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 'clamp(2.2rem,4vw,2.8rem)',
                      color: '#C9A84C',
                    }}
                  >
                    {car.price}
                  </span>
                  <span className="text-[12px] font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    DH / jour
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReserve}
                disabled={!car.available}
                className="relative overflow-hidden text-[12px] font-bold uppercase tracking-[2px] px-7 py-3.5 rounded-xl transition-all duration-300 outline-none"
                style={
                  car.available
                    ? {
                        background: '#C9A84C',
                        color: '#080E18',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
                      }
                    : {
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'not-allowed',
                      }
                }
                onMouseEnter={(e) => {
                  if (car.available) {
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,168,76,0.4)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (car.available) {
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,168,76,0.25)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                <span className="relative z-10 flex items-center gap-2 font-condensed">
                  Réserver maintenant
                  <span style={{ display: 'inline-block', transition: 'transform 0.2s' }}>→</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Main Fleet Slider ─────────────────────────────────────────────────────── */
export default function FleetSlider({ cars }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [direction, setDirection] = useState(1)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  // Reset to first slide when cars list changes (filter change)
  useEffect(() => { setActiveIdx(0) }, [cars])

  const goTo = useCallback((idx) => {
    if (idx === activeIdx || !cars.length) return
    setDirection(idx > activeIdx ? 1 : -1)
    setActiveIdx(idx)
  }, [activeIdx, cars.length])

  const prev = useCallback(() => {
    const idx = (activeIdx - 1 + cars.length) % cars.length
    setDirection(-1)
    setActiveIdx(idx)
  }, [activeIdx, cars.length])

  const next = useCallback(() => {
    const idx = (activeIdx + 1) % cars.length
    setDirection(1)
    setActiveIdx(idx)
  }, [activeIdx, cars.length])

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  // Touch swipe
  const onTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])
  const onTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current || 0))
    if (Math.abs(dx) > 42 && Math.abs(dx) > dy) {
      dx < 0 ? next() : prev()
    }
    touchStartX.current = null
  }, [next, prev])

  if (!cars?.length) return null

  const safeClamped = Math.min(activeIdx, cars.length - 1)

  return (
    <div
      className="w-full select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Slide ─────────────────────────────────────── */}
      <AnimatePresence mode="wait" custom={direction}>
        <CarCard
          key={cars[safeClamped]?.id}
          car={cars[safeClamped]}
          direction={direction}
        />
      </AnimatePresence>

      {/* ── Controls ──────────────────────────────────── */}
      <div className="mt-8 flex flex-col items-center gap-5">

        {/* Arrows + dots */}
        <div className="flex items-center gap-4">
          <ArrowBtn direction="left" onClick={prev} disabled={cars.length <= 1} />
          <div className="flex items-center gap-2">
            {cars.map((_, i) => (
              <NavDot key={i} active={i === safeClamped} onClick={() => goTo(i)} />
            ))}
          </div>
          <ArrowBtn direction="right" onClick={next} disabled={cars.length <= 1} />
        </div>

        {/* Counter */}
        <p className="text-[11px] font-medium tracking-[2px] uppercase" style={{ color: 'rgba(255,255,255,0.22)' }}>
          <span style={{ color: '#C9A84C', fontVariantNumeric: 'tabular-nums' }}>
            {String(safeClamped + 1).padStart(2, '0')}
          </span>
          {' '}/{' '}
          {String(cars.length).padStart(2, '0')}
        </p>

        {/* Thumbnail strip */}
        <div className="flex gap-3 flex-wrap justify-center">
          {cars.map((car, i) => (
            <Thumb key={car.id ?? `thumb-${i}`} car={car} active={i === safeClamped} onClick={() => goTo(i)} />
          ))}
        </div>
      </div>
    </div>
  )
}
